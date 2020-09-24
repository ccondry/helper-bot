// load .env file
require('dotenv').config()
// webex connection object
const webex = require('./models/webex')

// this bot's metadata
const me = require('./models/me')

// get method to delete the websocket device when done
const device = require('./models/device')

// function logWebsocket (event) {
//   // console.log(`websocket ${event.resource} ${event.event}:`, event.data)
//   console.log(event)
// }

async function main () {
  // start listeners
  try {
    // check authentication and cache this bot's metadata
    await me.get()
    // listen to memberships
    // await webex.memberships.listen()
    // webex.memberships.on('created', require('./models/handlers/membership-created'))
    // webex.memberships.on('updated', logWebsocket)
    // webex.memberships.on('deleted', logWebsocket)
    
    // listen to messages
    await webex.messages.listen()
    webex.messages.on('created', require('./models/handlers/message-created'))
    // webex.messages.on('deleted', logWebsocket)

    // listen to file attachments
    // await webex.attachmentActions.listen()
    // webex.attachmentActions.on('created', logWebsocket)
    // webex.attachmentActions.on('deleted', logWebsocket)
    
    console.log(`Using websockets for incoming messages/events with device ${webex.internal.device.url}`)
  } catch (e) {
    console.log(e.message)
    // exit
    process.exitCode = 1
  }

  // handle ctrl-c
  process.on('SIGINT', async function () {
    console.log(`${process.env.npm_package_name} stopping websocket listeners...`)
    try {
      // stop membership listening
      // await webex.memberships.stopListening()
      // webex.memberships.off('created')
      // webex.memberships.off('updated')
      // webex.memberships.off('deleted')
  
      // stop messages listening
      webex.messages.stopListening()
      webex.messages.off('created')
      // webex.messages.off('deleted')
      
      // stop attachment listening
      // await webex.attachmentActions.stopListening()
      // webex.attachmentActions.off('created')
      // webex.attachmentActions.off('deleted')

      // delete the websocket device on webex
      await device.delete(webex.internal.device.url)
      console.log(`successfully deleted websocket device on webex.`)

      // done
      console.log(`${process.env.npm_package_name} done. exiting.`)
    } catch (e) {
      // error stopping listeners
      console.log(`${process.env.npm_package_name} done, but error while stopping listeners:`, e.message)
    }
    
    // exit
    process.exitCode = 0
  })
}

main()