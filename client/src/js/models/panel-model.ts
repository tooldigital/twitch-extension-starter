
let server:string = 'https://clip-fx.firebaseapp.com'
if(window.location.href.match('local') !== null){
    server = 'https://clip-fx.localtunnel.me'
}

const Model = require('model-o')
const model = new Model({
	server,
	tuid: undefined,
	token: undefined,
	messages: [],
})

export default model