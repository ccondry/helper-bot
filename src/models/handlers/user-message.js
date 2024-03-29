const webex = require('../webex')
// database cache
const Cache = require('../cache')
// messages cache
const messages = new Cache('message')
// threads cache
const threads = new Cache('thread')
const file = require('../file')
const fetch = require('../fetch')
// const me = require('../me')
// const fs = require('fs')
// const stream = require('stream')

module.exports = async function (user, event, rooms) {
  // const logObject = {
  //   id: event.data.id,
  //   html: event.data.html,
  //   text: event.data.text,
  //   parentId: event.data.parentId,
  //   event: event.event
  // }
  // console.log('user message event data:', logObject)
  console.log('user message event data:', event)
  // did the user delete their message?
  if (event.event === 'deleted') {
    const messagePairs = await messages.find({userMessageId: event.data.id})
    if (!messagePairs.length) {
      // we dont have any records matching this message. can't delete the message.
      console.log(`couldn't delete user message ${event.data.id} from staff room - original message not found in cache.`)
      return
    }
    // for each message pair
    for (const message of messagePairs) {
      // get the matching staff room message
      const staffRoomMessage = await webex(user.token.access_token).messages.get(message.staffMessageId)
      console.log('found staff room message to delete:', staffRoomMessage)
      // delete the matching message in the staff rooom
      webex(user.token.access_token).messages.remove(staffRoomMessage.id)
      .catch(e => console.log('Failed to delete user message from the staff room:', e.message))
    }
    // done
    return
  }
  
  // remove @mention html tags
  let html
  try {
    const mentionRegex = /<spark-mention.*<\/spark-mention>/g
    html = event.data.html.replace(mentionRegex, '').trim()
  } catch (e) {
    // continue
  }

  // remove @mention user name from text
  // const botName = user.displayName
  // const text = event.data.text.replace(botName, '').trim()
  const text = event.data.text

  // construct the message to forward to staff room
  const data = {
    roomId: rooms.staffRoomId,
    text: `${event.data.personEmail} said ${text}`
  }

  // only send markdown if html has more than <p> formatting
  if (typeof html === 'string' && typeof text === 'string' && html.length > text.length + 7) {
    data.markdown = `${event.data.personEmail} said ${html}`
  }

  // attach thread parent ID, if found
  let thread
  if (event.data.parentId) {
    thread = await threads.findOne({userThreadId: event.data.parentId})
    if (thread) {
      console.log('found thread for user message:', thread)
      // message from a thread - map to thread in staff room
      data.parentId = thread.staffThreadId
    } else {
      console.log('no thread found for user message')
    }
  }

  // did the user update their message?
  if (event.event === 'updated') {
    // console.log('updated event data:', event.data)
    const message = await messages.findOne({userMessageId: event.data.id})
    if (message) {
      // get the matching staff message
      const staffRoomMessage = await webex(user.token.access_token).messages.get(message.staffMessageId)
      // console.log('staffRoomMessage:', staffRoomMessage)
      // update the matching message in the staff rooom
      const url = 'https://webexapis.com/v1/messages/' + staffRoomMessage.id 
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + user.token.access_token
        },
        body: JSON.stringify({
          roomId: staffRoomMessage.roomId,
          text: data.text,
          markdown: data.markdown
        })
      }
      fetch(url, options).catch(e => {
        console.log('Failed to update user message in the staff room:', e.message)
      })
      
      // done
      return
    }
  }

  // forward the first attached file, if any
  if (Array.isArray(event.data.files) && event.data.files.length) {
    // remove the first file from event data and get the file data
    const file1 = event.data.files.shift()
    // download file and forward file data to Webex
    try {
      const fileData = await file.get(file1, user.token.access_token)
      // send file ReadStream in teams message
      data.files = [fileData]
      // did they send only files, no text? change the message sent to staff
      if (typeof text !== 'string' || text.length === 0) {
        data.text = `${event.data.personEmail} sent this file`
        delete data.markdown
      }
    } catch (e) {
      // failed to get file - log to staff room
      webex(user.token.access_token).messages.create({
        roomId: rooms.staffRoomId,
        text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
      }).catch(e => console.log('Failed to send file error message to staff room:', e.message))
    }
  }

  // send message to staff room
  try {
    const response = await webex(user.token.access_token).messages.create(data)
    // save message ID pair in cache
    await messages.insertOne({
      userMessageId: event.data.id,
      staffMessageId: response.id
    })
    // save thread if it doesn't exist yet
    if (!thread) {
      // thread parent ID for user room
      const userThreadId = event.data.parentId ? event.data.parentId : event.data.id
      // thread parent ID for staff room
      const staffThreadId = response.id
      // add thread to cache
      await threads.insertOne({
        userThreadId,
        staffThreadId
      })
    }
    // more files to send?
    if (Array.isArray(event.data.files) && event.data.files.length >= 1) {
      // remove text and markdown from previous data
      delete data.text
      delete data.markdown
      // set thread ID if not set yet
      if (!data.parentId) {
        data.parentId = response.id
      }
      // send the rest of the files as separate messages
      for (const f of event.data.files) {
        try { 
          const fileData = await file.get(f, user.token.access_token)
          // send file ReadStream in teams message
          data.files = [fileData]
          // set text
          data.text = `${event.data.personEmail} also sent this file`
          console.log('sending the next file')
          // send the file
          webex(user.token.access_token).messages.create(data)
          .then(r => {
            // save the message pair
            // console.log('saving message pair:', messagePair)
            // save message ID pair in cache
            messages.insertOne({
              userMessageId: event.data.id,
              staffMessageId: response.id
            })
            .catch(e => console.log('failed to save message pair:', e.message))
          })
          .catch(e => {
            console.log(`failed to send staff ${event.data.personEmail} file ${f} to user room:`, e.message)
          })
        } catch (e) {
          // failed to get file - log to staff room
          webex(user.token.access_token).messages.create({
            roomId: rooms.staffRoomId,
            text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
          }).catch(e => console.log('Failed to send file error message to staff room:', e.message))
        }
      }
    }
  } catch (e) {
    // failed to send message
    console.log('failed to send user message to staff room:', e.message)
    // log to staff room
    webex(user.token.access_token).messages.create({
      roomId: rooms.staffRoomId,
      text: `failed to send user message to staff room: ${e.message}`
    }).catch(e2 => console.log('Failed to send error message to staff room:', e2.message))
  }
}