const fs = require('fs')
const path = require('path')
const color = require('color')
const ext = require('commander')
const jwt = require('jsonwebtoken')
const request = require('request')
const express = require('express')
const app = express()
const functions = require('firebase-functions')
const config = functions.config()
console.log(config)

const verboseLogging = true // verbose logging turn off for production

const initialColor = color('#6441A4')     // super important bleedPurple, etc.
const serverTokenDurationSec = 30         // our tokens for pubsub expire after 30 seconds
const userCooldownMs = 1000               // maximum input rate per user to prevent bot abuse
const userCooldownClearIntervalMs = 60000 // interval to reset our tracking object
const channelCooldownMs = 1000            // maximum broadcast rate per channel
const bearerPrefix = 'Bearer '            // JWT auth headers have this prefix

const channelColors = { }             // current extension state
const channelCooldowns = { }           // rate limit compliance
let   userCooldowns = { }             // spam prevention

const STRINGS = {
	env_secret: `* Using env var for secret`,
	env_client_id: `* Using env var for client-id`,
	env_owner_id: `* Using env var for owner-id`,
	server_started: `Server running at %s`,
	missing_secret: "Extension secret required.\nUse argument '-s <secret>' or env var 'EXT_SECRET'",
	missing_clientId: "Extension client ID required.\nUse argument '-c <client ID>' or env var 'EXT_CLIENT_ID'",
	missing_ownerId: "Extension owner ID required.\nUse argument '-o <owner ID>' or env var 'EXT_OWNER_ID'",
	message_send_error: "Error sending message to channel %s",
	pubsub_response: "Message to c:%s returned %s",
	cycling_color: "Cycling color for c:%s on behalf of u:%s",
	color_broadcast: "Broadcasting color %s for c:%s",
	send_color: "Sending color %s to c:%s",
	cooldown: "Please wait before clicking again",
	invalid_jwt: "Invalid JWT"
}

ext
	.version(require('../package.json').version)
	.option('-s, --secret <secret>', 'Extension secret')
	.option('-c, --client-id <client_id>', 'Extension client ID')
	.option('-o, --owner-id <owner_id>','Extension owner ID')
	.parse(process.argv)

const ENV_SECRET = config.twitch.secret
const ENV_CLIENT_ID = config.twitch.client_id
const ENV_OWNER_ID = config.twitch.owner_id

if(!ext.secret && ENV_SECRET) { 
	console.log(STRINGS.env_secret)
	ext.secret = ENV_SECRET 
}
if(!ext.clientId && ENV_CLIENT_ID) { 
	console.log(STRINGS.env_client_id)
	ext.clientId = ENV_CLIENT_ID
}

if(!ext.ownerId && ENV_OWNER_ID) {
	console.log(STRINGS.env_owner_id)
	ext.ownerId = ENV_OWNER_ID
}

// YOU SHALL NOT PASS
if(!ext.secret) { 
	console.log(STRINGS.missing_secret)
	process.exit(1) 
}
if(!ext.clientId) {
	console.log(STRINGS.missing_clientId)
	process.exit(1) 
}

if(!ext.ownerId) {
	console.log(STRINGS.missing_ownerId)
	process.exit(1)
}

// log function that won't spam in production
const verboseLog = verboseLogging ? console.log.bind(console) : function(){}

// use a common method for consistency
function verifyAndDecode(header) {
	try {
		if (!header.startsWith(bearerPrefix)) {
			return false
		}
		const token = header.substring(bearerPrefix.length)
		const secret = Buffer.from(ext.secret, 'base64')
		return jwt.verify(token, secret, { algorithms: ['HS256'] }) 
	}
	catch (e) {
		return false
	}
}

function colorCycleHandler (req, res) {

	// once more with feeling: every request MUST be verified, for SAFETY!
	const payload = verifyAndDecode(req.headers.authorization)
	if(!payload) { throw Error(STRINGS.invalid_jwt) }

	const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload

	// we need to store the color for each channel using the extension
	let currentColor = channelColors[channelId] || initialColor
	
	// bot abuse prevention - don't allow a single user to spam the button
	if (userIsInCooldown(opaqueUserId)) {
	  throw Error(STRINGS.cooldown)
	}

	verboseLog(STRINGS.cycling_color, channelId, opaqueUserId)
	  
	// rotate the color like a wheel
	currentColor = color(currentColor).rotate(30).hex()
	
	// save the new color for the channel
	channelColors[channelId] = currentColor
	
	attemptColorBroadcast(channelId)
	
	res.send(currentColor)
}

function colorQueryHandler(req, res) {
	console.log('colorQueryHandler')
	
	// REMEMBER! every request MUST be verified, for SAFETY!
	const payload = verifyAndDecode(req.headers.authorization)
	if(!payload) { return res.status(500).send(STRINGS.invalid_jwt) } // seriously though

	const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload
	const currentColor = color(channelColors[channelId] || initialColor).hex()
	console.log('currentColor', currentColor)

	verboseLog(STRINGS.send_color, currentColor, opaqueUserId)
	res.send(currentColor)
}

function attemptColorBroadcast(channelId) {

	// per-channel rate limit handler
	const now = Date.now()
	const cooldown = channelCooldowns[channelId]
  
	if (!cooldown || cooldown.time < now) { 
		// we can send immediately because we're outside the cooldown
		sendColorBroadcast(channelId)
		channelCooldowns[channelId] = { time: now + channelCooldownMs }
		return
	}
  
	// schedule a delayed broadcast only if we haven't already
	if (!cooldown.trigger) {
		cooldown.trigger = setTimeout(sendColorBroadcast, now - cooldown.time, channelId)
	}
}

function sendColorBroadcast(channelId) {
  
	// our HTTP headers to the Twitch API
	const headers = {
		'Client-Id': ext.clientId,
		'Content-Type': 'application/json',
		'Authorization': bearerPrefix + makeServerToken(channelId)
	}
	
	const currentColor = color(channelColors[channelId] || initialColor).hex()

	// our POST body to the Twitch API
	const body = JSON.stringify({
		content_type: 'application/json',
		message: currentColor,
		targets: [ 'broadcast' ]
	})

	verboseLog(STRINGS.color_broadcast, currentColor, channelId)

	// send our broadcast request to Twitch
	request(
		`https://api.twitch.tv/extensions/message/${channelId}`,
		{
			method: 'POST',
			headers,
			body
		}, 
		(err, res) => {
			if (err) {
				console.log(STRINGS.messageSendError, channelId)
			} else {
				verboseLog(STRINGS.pubsub_response, channelId, res.statusCode)
			}
	})
}

function makeServerToken(channelId) {
  
	const payload = {
		exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
		channel_id: channelId,
		user_id: ext.ownerId, // extension owner ID for the call to Twitch PubSub
		role: 'external',
		pubsub_perms: {
			send: [ '*' ],
		},
	}

	const secret = Buffer.from(ext.secret, 'base64')
	return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

function userIsInCooldown(opaqueUserId) {
  
	const cooldown = userCooldowns[opaqueUserId]
	const now = Date.now()
	if (cooldown && cooldown > now) {
		return true
	}
	
	// voting extensions should also track per-user votes to prevent skew
	userCooldowns[opaqueUserId] = now + userCooldownMs
	return false
}

app.use((req, res, next) => {
	console.log('!!', req.path)
	next()
})
app.get('/color/query', colorQueryHandler)
app.post('/color/cycle', colorCycleHandler)

console.log(STRINGS.server_started)
// periodically clear cooldown tracking to prevent unbounded growth due to
// per-session logged out user tokens
setInterval(() => { userCooldowns = {} }, userCooldownClearIntervalMs)

// https://firebase.google.com/docs/functions/write-firebase-functions
exports.main = functions.https.onRequest(app)

