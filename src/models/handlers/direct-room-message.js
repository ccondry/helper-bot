// webex client
const webex = require('../webex')
// database cache
const Cache = require('../cache')
// messages cache
const messages = new Cache('message')
// threads cache
const threads = new Cache('thread')
// download file from webex and save locally. returns our public URL for file
const file = require('../file')
const fetch = require('../fetch')

// handle messages sent from staff/admins in the direct messages room
module.exports = async function (user, event) {
  // console.log('direct room message event')
  // const logObject = {
  //   id: event.data.id,
  //   html: event.data.html,
  //   text: event.data.text,
  //   parentId: event.data.parentId,
  //   event: event.event
  // }
  // console.log('direct room message event data:', logObject)
  console.log('direct room message event data:', event)
  // did the staff delete their message?
  if (event.event === 'deleted') {
    const messagePairs = await messages.find({directRoomMessageId: event.data.id})
    if (!messagePairs.length) {
      // console.log(`can't delete staff message from user room - didn't find this message:`, message)
      // console.log('in messages', messages)
      // we dont have a record of this thread. can't delete the message.
      console.log(`couldn't delete direct room message ${event.data.id} from 1-1 with user - original message not found in cache.`)
      return
    }
    for (const message of messagePairs) {
      // get the matching 1-1 message
      const directMessage = await webex(user.token.access_token).messages.get(message.directMessageId)
      console.log('found direct message to delete:', directMessage)
      // delete the matching 1-1 message
      webex(user.token.access_token).messages.remove(directMessage.id)
      // .then(r => console.log('deleted staff message from user room:', userRoomMessage))
      .catch(e => console.log('Failed to delete 1-1 message:', e.message))
    }
    // done
    return
  }

  // start building data object for the final message
  const data = {}

  // attach thread parent ID, if found
  let thread
  if (event.data.parentId) {
    thread = await threads.findOne({directRoomThreadId: event.data.parentId})
    if (thread) {
      console.log('found thread for direct room message:', thread)
      // message from a thread - map to thread with user
      data.parentId = thread.directThreadId
    } else {
      console.log('no thread found for direct room message')
    }
  }

  // find the person we should message from the thread info
  if (thread) {
    // get the matching direct message
    const directMessage = await webex(user.token.access_token).messages.get(thread.directThreadId)
    // set 1-1 room ID from the direct message
    data.roomId = directMessage.roomId
  } else {
    // extract the person email we should forward the message to
    const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    const emailMatches = event.data.html.match(emailRegex)
    // if the staff didn't include the user email
    if (!emailMatches > 0) {
      // stop processing
      console.log('user tagged the bot in direct messages room, but did not specify a user to send the message to.')
      return
    }
    // it must be the first person email in the message
    data.toPersonEmail = emailMatches[0]
  }
  // copy the plain text message from the event, and remove the user's email
  data.text = event.data.text.replace(data.toPersonEmail, '').trim()

  // set markdown data
  try {
    // remove spark-mention tags
    const mentionRegex = /<spark-mention.*<\/spark-mention>/g
    data.markdown = event.data.html.replace(mentionRegex, '')
    
    // trim any whitespace at the beginning or end of the message
    data.markdown = data.markdown.trim()
  } catch (e) {
    // continue without markdown
  }

  // did the staff update their message?
  if (event.event === 'updated') {
    // console.log('updated event data:', event.data)
    // find the first message to update (subsequent pairs would be additional
    // file attachments)
    const message = await messages.findOne({directRoomMessageId: event.data.id})
    if (message) {
      // get the matching direct message
      const directMessage = await webex(user.token.access_token).messages.get(message.directMessageId)
      // console.log('directMessage:', directMessage)
      // update the matching message in 1-1 with user
      const url = 'https://webexapis.com/v1/messages/' + directMessage.id 
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + user.token.access_token
        },
        body: JSON.stringify({
          roomId: directMessage.roomId,
          text: data.text,
          markdown: data.markdown
        })
      }
      fetch(url, options).catch(e => {
        console.log(`Failed to update direct message to ${toPersonEmail}: ${e.message}`)
      })
      
      // done
      return
    }
  }

  // forward the first attached file, if any
  if (Array.isArray(event.data.files) && event.data.files.length) {
    // remove the first file from event data and get the file data
    const file1 = event.data.files.shift()
    // download file and forward file data to webex
    try {
      const fileData = await file.get(file1, user.token.access_token)
      // send file link or ReadStream in teams message
      data.files = [fileData]
      // did they send only files, no text?
      if (typeof data.text !== 'string' || data.text.length === 0) {
        // delete markdown
        delete data.markdown
      } 
    } catch (e) {
      // failed to upload/write file - log to direct messages room
      webex(user.token.access_token).messages.create({
        roomId: user.directRoomId,
        text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
      }).catch(e => console.log('Failed to send file error message to direct messages room:', e.message))
    }
  }

  // send message to user directly
  try {
    // send message
    const response = await webex(user.token.access_token).messages.create(data)
    console.log('send message response', response)
    const messagePair = {
      directMessageId: response.id,
      directRoomMessageId: event.data.id
    }
    // console.log('saving message pair:', messagePair)
    // save message ID pair in cache
    await messages.insertOne(messagePair)
    // save thread if it doesn't exist yet
    if (!thread) {
      // thread parent ID for user room
      const directThreadId = response.id
      // thread parent ID for staff room
      const directRoomThreadId = event.data.parentId ? event.data.parentId : event.data.id
      // add thread to cache
      await threads.insertOne({
        directThreadId,
        directRoomThreadId
      })
    }
    // more files to send?
    if (Array.isArray(event.data.files) && event.data.files.length >= 1) {
      // remove previous text and markdown properties
      delete data.markdown
      delete data.text
      // set thread ID if not set yet
      if (!data.parentId) {
        data.parentId = response.id
      }
      // send the rest of the files as separate messages on the same thread
      for (const f of event.data.files) {
        // download file and forward file data to webex
        try {
          const fileData = await file.get(f, user.token.access_token)
          // send file ReadStream in teams message
          data.files = [fileData]
          // set text
          // data.text = `${event.data.personEmail} also sent this file`
          console.log(`sending the next file to ${data.toPersonEmail}`)
          // send the file
          webex(user.token.access_token).messages.create(data)
          .then(r => {
            // save the message pair
            // console.log('saving message pair:', messagePair)
            // save message ID pair in cache
            messages.insertOne({
              directMessageId: response.id,
              directRoomMessageId: event.data.id
            })
            .catch(e => console.log('failed to save message pair:', e.message))
          })
          .catch(e => {
            console.log(`failed to send staff ${event.data.personEmail} file ${f} to user ${data.toPersonEmail} directly:`, e.message)
          })
        } catch (e) {
          // failed to upload file - log to staff room
          webex(user.token.access_token).messages.create({
            roomId: user.directRoomId,
            text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
          }).catch(e => console.log('Failed to send file error message to direct messages room:', e.message))
        }
        
      }
    }
  } catch (e) {
    console.log('failed to send direct message to user:', e.message)
  }
}