// load .env file
require('dotenv').config()
// webex connection object
const webex = require('./models/webex')
// download file from webex and save locally. returns our public URL for file
const getFile = require('./models/file').get

// cache of threads
const threads = {}

// rooms cache
const rooms = {}

// this bot
let me = null

// get thread, creating if it doesn't exist yet
function getThread (event) {
  if (threads[event.data.parentId]) {
    return threads[event.data.parentId]
  } else {
    threads[event.data.parentId] = ''
  }
}

async function forwardUserFile(personEmail, file, roomId) {
  // get file
  const options = {
    headers: {
      Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
    }
  }
  // console.log('forwarding file', file, 'to', roomId)
  // download file and get publicly-accessible link for the file
  const fileUrl = await getFile(file, options)
  // send message with file attachment
  webex.messages.create({
    text: `${personEmail} sent this file`,
    roomId,
    files: fileUrl
  })
}

async function forwardStaffFile(file, roomId) {
  // get file
  const options = {
    headers: {
      Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
    }
  }
  // download file and get publicly-accessible link for the file
  const fileUrl = await getFile(file, options)
  // send message with file attachment
  webex.messages.create({
    roomId,
    files: fileUrl
  })
}

// received message
async function handleMessageCreated (event) {
  // ignore messages sent from this bot
  if (event.data.personId === me.id) {
    return
  }

  try {
    // logWebsocket(event)
    if (event.resource === 'messages') {
      // receieved message
      let thread
      // thread reply?
      if (event.data.parentId) {
        thread = getThread(event)
      }
      // console.log(`(${event.data.roomType}) ${event.data.personEmail} said ${event.data.text} ${thread ? 'in a thread' : ''}`)
    }

    if (event.data.roomId === process.env.USER_ROOM_ID) {
      // message came from user support room

      // forward each file attachment as a new file message
      // since we can only send 1 file at a time with REST API
      if (event.data.files) {
        for (const file of event.data.files) {
          forwardUserFile(event.data.personEmail, file, process.env.STAFF_ROOM_ID)
        }
      }

      const mentionRegex = /<spark-mention.*<\/spark-mention>/g
      const html = event.data.html.replace(mentionRegex, '').trim()
      
      // construct the message to forward to staff room
      const data = {
        roomId: process.env.STAFF_ROOM_ID,
        text: `${event.data.personEmail} said ${event.data.text}`,
        markdown: `${event.data.personEmail} said ${html}`
      }
      // send message to staff room
      await webex.messages.create(data)

    } else if (event.data.roomId === process.env.STAFF_ROOM_ID) {
      // message came from staff room
      // console.log('message from staff to user:', event.data)

      // forward each file attachment as a new file message
      // since we can only send 1 file at a time with REST API
      if (event.data.files) {
        for (const file of event.data.files) {
          forwardStaffFile(file, process.env.USER_ROOM_ID)
        }
      }

      // parse the html output to nice markdown with the mention to this bot removed
      // and any emails turned into real mentions
      const mentionRegex = /<spark-mention.*<\/spark-mention>/g
      const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
      const markdown = event.data.html.replace(mentionRegex, '').replace(emailRegex, '<@personEmail:$&>').trim()

      // parse message text
      // const parts = event.data.text.split(' ')
      // remove bot name from message text
      // parts.shift()
      // mentioned user is next
      // const user = parts.shift()
      // followed by the actual message
      // const text = parts.join(' ')
      // const markdown = `<@personEmail:${user}> ${text}`
      const data = {
        roomId: process.env.USER_ROOM_ID,
        // text,
        markdown
      }
      // send message to user room
      try {
        await webex.messages.create(data)
      } catch (e) {
        // console.log(e.message)
      }
    } else {
      // unknown room
      console.log('message from unknown room:', event)
    }
  } catch (e) {
    console.log(e)
  }
}

function logWebsocket (event) {
  // console.log(`websocket ${event.resource} ${event.event}:`, event.data)
  console.log(event)
}

// get room details from room ID
async function getRoom (id) {
  if (rooms[id]) {
    return rooms[id].name
  } else {
    const room = await webex.rooms.get(id)
    // add to cache
    rooms[id] = room
    return room
  }
}

async function handleMembershipCreated (event) {
  // logWebsocket(event)
  try {
    const room = await getRoom(event.data.roomId)
    console.log(`${event.data.personDisplayName} (${event.data.personEmail}) was added to ${room.title} ${room.isModerator ? 'as a moderator' : ''}`)
  } catch (e) {
    console.log(e)
  }
}

function handleMembershipUpdated (event) {
  return logWebsocket(event)
}

async function handleMembershipDeleted (event) {
  // logWebsocket(event)
  try {
    const room = await getRoom(event.data.roomId)
    // console.log('room', room)
    console.log(`${event.data.personDisplayName} (${event.data.personEmail}) was removed from ${room ? room.title : event.data.roomId}`)
  } catch (e) {
    console.log(e)
  }
}

function handleMessageUpdated (event) {
  return logWebsocket(event)
}

function handleMessageDeleted (event) {
  return logWebsocket(event)
}

function handleAttachmentCreated (event) {
  return logWebsocket(event)
}

function handleAttachmentDeleted (event) {
  return logWebsocket(event)
}

async function main () {
  // test authentication
  try {
    me = await webex.people.get('me')
    console.log(`${process.env.npm_package_name} authenticated to Webex Teams as bot ${me.displayName}`)
  } catch (e) {
    throw Error(`${process.env.npm_package_name} could not authenticate to Webex Teams`)
  }
  
  // start listeners
  try {
    // listen to memberships
    await webex.memberships.listen()
    webex.memberships.on('created', handleMembershipCreated)
    webex.memberships.on('updated', handleMembershipUpdated)
    webex.memberships.on('deleted', handleMembershipDeleted)
    
    // listen to messages
    await webex.messages.listen()
    webex.messages.on('created', handleMessageCreated)
    webex.messages.on('deleted', handleMessageDeleted)

    // listen to file attachments
    await webex.attachmentActions.listen()
    webex.attachmentActions.on('created', handleAttachmentCreated)
    webex.attachmentActions.on('deleted', handleAttachmentDeleted)
  } catch (e) {
    // rethrow all errors
    throw e
  }

  // handle ctrl-c
  process.on('SIGINT', function () {
    console.log(`${process.env.npm_package_name} stopping websocket listeners...`)
    // stop membership listening
    webex.memberships.stopListening()
    webex.memberships.off('created')
    webex.memberships.off('updated')
    webex.memberships.off('deleted')

    // stop messages listening
    webex.messages.stopListening()
    webex.messages.off('created')
    webex.messages.off('deleted')
    
    // stop attachment listening
    webex.attachmentActions.stopListening()
    webex.attachmentActions.off('created')
    webex.attachmentActions.off('deleted')

    // done
    console.log(`${process.env.npm_package_name} done. exiting.`)
    
    // exit
    process.exit()
  })
}

main()
.then(r => console.log('Using websockets for incoming messages/events'))
.catch(e => console.log(e))