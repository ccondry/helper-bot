const webex = require('../webex')
const threads = require('../threads')
const messages = require('../messages')
const file = require('../file')
const fetch = require('../fetch')
// const me = require('../me')
// const fs = require('fs')
// const stream = require('stream')

module.exports = async function (user, event, rooms) {
  // did the user delete their message?
  if (event.event === 'deleted') {
    // console.log('deleted event data:', event.data)
    const message = messages.find(v => v.userMessageId === event.data.id)
    if (!message) {
      // we dont have a record of this thread. can't delete the message.
      return
    }
    // get the matching staff room message
    const staffRoomMessage = await webex(user.token.access_token).messages.get(message.staffMessageId)
    // delete the matching message in the staff rooom
    webex(user.token.access_token).messages.remove(staffRoomMessage)
    .catch(e => console.log('Failed to delete user message from the staff room:', e.message))
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

  // find matching thread for this message
  const thread = threads.find(v => v.userThreadId === event.data.parentId)
  let parentId
  if (thread) {
    // message from a thread - map to thread in staff room
    parentId = thread.staffThreadId
  }

  // construct the message to forward to staff room
  const data = {
    roomId: rooms.staffRoomId,
    text: `${event.data.personEmail} said ${text}`,
    parentId
  }
  // only send markdown if html has more than <p> formatting
  if (typeof html === 'string' && typeof text === 'string' && html.length > text.length + 8) {
    data.markdown = `${event.data.personEmail} said ${html}`
  }

  // did the user update their message?
  if (event.event === 'updated') {
    // console.log('updated event data:', event.data)
    const t = messages.find(v => v.userMessageId === event.data.id)
    if (!t) {
      // we dont have a record of this message pair. can't update the message.
      return
    }
    // get the matching staff message
    const staffRoomMessage = await webex(user.token.access_token).messages.get(t.staffMessageId)
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

  // forward the first attached file, if any
  if (Array.isArray(event.data.files) && event.data.files.length) {
    // remove the first file from event data and get the file data
    const file1 = event.data.files.shift()
    // download file and get publicly-accessible link for the file
    try {
      const fileData = await file.get(file1, user.token.access_token)
      // send file link or ReadStream in teams message
      data.files = [fileData]
      // did they send only files, no text? change the message sent to staff
      if (typeof text !== 'string' || text.length === 0) {
        data.text = `${event.data.personEmail} sent this file`
        delete data.markdown
      }
    } catch (e) {
      // failed to upload/write file - log to staff room
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
    messages.push({
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
      threads.push({
        userThreadId,
        staffThreadId
      })
    }
    // more files to send?
    if (Array.isArray(event.data.files) && event.data.files.length > 1) {
      // remove markdown from previous data
      delete data.markdown
      // send the rest of the files as separate messages
      for (const file of event.data.files) {
        // download file and get publicly-accessible link for the file
        let fileUrl
        try {
          fileUrl = await getFile(file)
        } catch (e) {
          // failed to upload/write file - log to staff room
          webex(user.token.access_token).messages.create({
            roomId: rooms.staffRoomId,
            text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
          }).catch(e => console.log('Failed to send file error message to staff room:', e.message))
        }
        // send message with file attachment
        data.files = fileUrl
        data.text = `${event.data.personEmail} also sent this file`
        webex(user.token.access_token).messages.create(data)
        .catch(e => {
          console.log(`failed to send user ${event.data.personEmail} file ${file} to support room:`, e.message)
        })
      }
    }
  } catch (e) {
    console.log('failed to send user message to staff room:', e.message)
  }
}