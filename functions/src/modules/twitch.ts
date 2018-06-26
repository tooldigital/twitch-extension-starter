
const request = require('request')
const jwt = require('jsonwebtoken')
const {stringify} = require('querystring')
const serverTokenDurationSec = 30
const bearerPrefix = 'Bearer '

// use a common method for consistency
function verifyAndDecode(header, secret) {
	try {
		if (!header.startsWith(bearerPrefix)) {
			return false
		}
		const token = header.substring(bearerPrefix.length)
		const secretBuffer = Buffer.from(secret, 'base64')
		return jwt.verify(token, secretBuffer, { algorithms: ['HS256'] }) 
	}
	catch (e) {
		return false
	}
}

class Twitch {

    secret: string
    client_id: string
    owner_id: string

    constructor(opts){
        console.log('Twitch.constructor', opts)
        this.secret = opts.secret
        this.client_id = opts.client_id        
        this.owner_id = opts.owner_id
        this.verifyRequest = this.verifyRequest.bind(this)
    }

    verifyRequest(req, res, next){
        // console.log('verifyRequest', req.headers.authorization)
        // REMEMBER! every request MUST be verified, for SAFETY!
        const payload = verifyAndDecode(req.headers.authorization, this.secret)
        if(!payload) { 
            console.error('INVALID JWT')
            return res.status(500).send('invalid jwt')
        }
        req.payload = payload
        next()
    }

    createServerToken(channel_id) {
        const payload = {
            exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
            channel_id,
            user_id: this.owner_id, // extension owner ID for the call to Twitch PubSub
            role: 'external',
            pubsub_perms: {
                send: [ '*' ],
            },
        }

        const secret = Buffer.from(this.secret, 'base64')
        return jwt.sign(payload, secret, { algorithm: 'HS256' })
    }

    // getAuthURL(scopes = [], callbackURL = ''){
    //     let qs = stringify({
    //         response_type: 'token',
    //         client_id: this.client_id,
    //         redirect_uri: callbackURL,
    //         scope: scopes.join(' ')
    //     })
    //     let reqURL = `https://id.twitch.tv/oauth2/authorize?${qs}`
    //     return reqURL
    // }

    getAppAccessToken(scopes = []){
        return new Promise((resolve, reject) => {
            const queryObj = {
                client_id: this.client_id,
                client_secret: this.secret,
                grant_type: 'client_credentials',
                scope: scopes.join(' ')
            }
            // console.log(queryObj)
            const qs = stringify(queryObj)
            const reqURL = `https://id.twitch.tv/oauth2/token?${qs}`
            request.post(reqURL, (err, res, body) => {
                if(err) return reject(err)
                resolve(body)
            })
        })
    }

    createClip(broadcaster_id, appToken){
        return new Promise((resolve, reject) => {
            const reqURL = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcaster_id}`
            request.post(reqURL, {
                headers: {
                    'Authorization': bearerPrefix + appToken
                    // 'Authorization': bearerPrefix + this.createServerToken(channel_id)
                }
            }, (err, res, body) => {
                if(err) return reject(err)
                resolve(body)
            })
        })
    }

    broadcast(channel_id:string, message:object, user_id?:string){ return new Promise((resolve, reject) => {
        console.log('Twitch.broadcast', channel_id, message, user_id)

        // our HTTP headers to the Twitch API
        const headers = {
            'Client-Id': this.client_id,
            'Content-Type': 'application/json',
            'Authorization': bearerPrefix + this.createServerToken(channel_id)
        }
        
        // send our broadcast request to Twitch
        request(
            `https://api.twitch.tv/extensions/message/${channel_id}`,
            {
                method: 'POST',
                headers,
                form: {
                    content_type: 'application/json',
                    targets: user_id ? [`whisper-${user_id}`] : ['broadcast'],
                    message: JSON.stringify(message),
                },
                json: true,
            }, 
            (err, res, body) => {
                // console.log('!!!!!!!!!', body, typeof body)
                if(err) return reject(err)
                if(body) {
                    body = JSON.parse(body)
                    if(body.error) return reject(body)
                }
                return resolve({type: 'success', status: 200})
            }
        )
    })}

    static get scopes (){
        return {
            user_read_email: 'user:read:email',
            user_edit: 'user:edit',
            clips_edit: 'clips:edit',
            bits_read: 'bits:read',
            analytics_read_games: 'analytics:read:games',
            analytics_read_extensions: 'analytics:read:extensions',
        }
    }

}

export default Twitch
