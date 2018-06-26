require('../../styles/panel.scss')

import util from '../util'
import model from '../models/panel-model'
const twitch = (<any>window).Twitch.ext;

// for debugging only
(function(){ (<any>window).model = model })()

twitch.onContext((context) => {
    twitch.rig.log(context)
})

twitch.onAuthorized((auth) => {
    // save our credentials
    model.token = auth.token
    model.tuid = auth.userId
})

// listen to direct messages
// twitch.listen(`whisper-${model.tuid}`, (target, contentType, message) => {
//     console.log(target, contentType, message, typeof message)
// })

// listen to global messages
twitch.listen('broadcast', (target, contentType, message) => {
    console.log(target, contentType, message, typeof message)
    if(contentType === 'application/json'){ message = JSON.parse(message) }
    if(message.message) {
        // model.messages = model.messages.concat(message.message)
        model.emit('message', message.message)
    }
})

$(() => {
    console.log('hello')
    const $messages = $('#messages')
    const $input = $('input#text')
    const $sendBtn = $('button#send')

    model.on('message', (msg) => {
        $messages.append(`<div>${msg.sender}: ${msg.text}</div>`)
    })

    $sendBtn.click(() => {
        console.log('clicked send button')
        util.ajax('POST', `${model.server}/message`, model.token, {
            sender: model.tuid,
            text: (<HTMLInputElement>$input[0]).value
        }).then(result => console.log(result)).catch(err => console.error(err))
    })
})
