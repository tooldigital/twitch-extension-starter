
// https://firebase.google.com/docs/functions/typescript
import {https} from 'firebase-functions'
import * as express from 'express'
import config from './modules/config'
console.log(config)

import db from './modules/db'
import Twitch from './modules/twitch'
const twitch = new Twitch((<any>config).twitch)

const app = express()

app.use((req, res, next) => {
	console.log('!!', req.path)
	console.log(req.headers)
	console.log(req.body)
	next()
})

app.post('/message',
	twitch.verifyRequest, 
	(req, res) => {
		const payload = (<any>req).payload
		console.log('/message', payload)
		twitch.broadcast(payload.channel_id, {message: req.body})
			.then(result => res.send(result))
			.catch(err => {
				console.error('echo error', err)
				res.status(500).send(err.message)
			})
	}
)

module.exports.main = https.onRequest(app)
	