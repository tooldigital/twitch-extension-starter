
import {config as firebaseConfig} from 'firebase-functions'
const functionsConfig = firebaseConfig()

const config = Object.assign({
    host: functionsConfig.env === 'local' ? 'https://clip-fx.localtunnel.me' : 'https://clip-fx.firebaseapp.com'
}, functionsConfig)

export default config
