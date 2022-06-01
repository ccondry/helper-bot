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

module.exports = async function (user, event, rooms) {
  // console.log('staff message event')
  // const logObject = {
  //   id: event.data.id,
  //   html: event.data.html,
  //   text: event.data.text,
  //   parentId: event.data.parentId,
  //   event: event.event
  // }
  // console.log('staff message event data:', logObject)
  console.log('staff message event data:', event)
  // did the staff delete their message?
  if (event.event === 'deleted') {
    const messagePairs = await messages.find({staffMessageId: event.data.id})
    if (!messagePairs.length) {
      // console.log(`can't delete staff message from user room - didn't find this message:`, message)
      // console.log('in messages', messages)
      console.log(`couldn't delete staff message ${event.data.id} from user room - original message not found in cache.`)
      // we dont have a record of this thread. can't delete the message.
      return
    }
    for (const message of messagePairs) {
      // get the matching user room message
      const userRoomMessage = await webex(user.token.access_token).messages.get(message.userMessageId)
      console.log('found user room message to delete:', userRoomMessage)
      // delete the matching message in the staff rooom
      webex(user.token.access_token).messages.remove(userRoomMessage)
      // .then(r => console.log('deleted staff message from user room:', userRoomMessage))
      .catch(e => console.log('Failed to delete staff message from the user room:', e.message))
    }
    // done
    return
  }

  // copy the plain text message from the event
  const text = event.data.text
  
  // sending message to user room
  const data = {
    roomId: rooms.userRoomId,
    text
  }

  // set markdown data
  try {
    // remove spark-mention tags
    const mentionRegex = /<spark-mention.*<\/spark-mention>/g
    data.markdown = event.data.html.replace(mentionRegex, '')

    // replace email addresses with people mentions
    const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    data.markdown = data.markdown.replace(emailRegex, '<@personEmail:$&>')

    // trim any whitespace at the beginning or end of the message
    data.markdown = data.markdown.trim()
  } catch (e) {
    // continue
  }

  // attach thread parent ID, if found
  
  let thread
  if (event.data.parentId) {
    let thread = await threads.findOne({staffThreadId: event.data.parentId})
    if (thread) {
      console.log('found thread for staff message:', thread)
      // message from a thread - map to thread in user room
      data.parentId = thread.userThreadId
    } else {
      console.log('no thread found for staff message')
    }
  }

  // did the staff update their message?
  if (event.event === 'updated') {
    // console.log('updated event data:', event.data)
    // find the first message to update (subsequent pairs would be additional
    // file attachments)
    const message = await messages.findOne({staffMessageId: event.data.id})
    if (message) {
      // get the matching user room message
      const userRoomMessage = await webex(user.token.access_token).messages.get(message.userMessageId)
      // console.log('userRoomMessage:', userRoomMessage)
      // update the matching message in the user rooom
      const url = 'https://webexapis.com/v1/messages/' + userRoomMessage.id 
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + user.token.access_token
        },
        body: JSON.stringify({
          roomId: userRoomMessage.roomId,
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
    // download file and forward file data to webex
    try {
      const fileData = await file.get(file1, user.token.access_token)
      // send file link or ReadStream in teams message
      data.files = [fileData]
      // did they send only files, no text? change the message sent to users
      if (typeof data.text !== 'string' || data.text.length === 0) {
        // data.text = `${event.data.personEmail} sent this file`
        delete data.markdown
      } 
    } catch (e) {
      console.log(`${event.data.personEmail} tried to send a file, but there was an error:`, e)
      // failed to upload/write file - log to staff room
      webex(user.token.access_token).messages.create({
        roomId: rooms.staffRoomId,
        text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
      }).catch(e => console.log('Failed to send file error message to staff room:', e.message))
    }
  }

  // send message to user room
  try {
    // send message
    const response = await webex(user.token.access_token).messages.create(data)
    console.log('send message response', response)
    const messagePair = {
      userMessageId: response.id,
      staffMessageId: event.data.id
    }
    // console.log('saving message pair:', messagePair)
    // save message ID pair in cache
    await messages.insertOne(messagePair)
    // save thread if it doesn't exist yet
    if (!thread) {
      // thread parent ID for user room
      const userThreadId = response.id
      // thread parent ID for staff room
      const staffThreadId = event.data.parentId ? event.data.parentId : event.data.id
      // add thread to cache
      await threads.insertOne({
        userThreadId,
        staffThreadId
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
          console.log('sending the next file')
          // send the file
          webex(user.token.access_token).messages.create(data)
          .then(r => {
            // save the message pair
            // console.log('saving message pair:', messagePair)
            // save message ID pair in cache
            messages.insertOne({
              userMessageId: response.id,
              staffMessageId: event.data.id
            })
            .catch(e => console.log('failed to save message pair:', e.message))
          })
          .catch(e => {
            console.log(`failed to send staff ${event.data.personEmail} file ${f} to user room:`, e.message)
          })
        } catch (e) {
          console.log(`${event.data.personEmail} tried to send a file, but there was an error:`, e)
          // failed to upload file - log to staff room
          webex(user.token.access_token).messages.create({
            roomId: rooms.staffRoomId,
            text: `${event.data.personEmail} tried to send a file, but there was an error: ${e.message}`
          }).catch(e => console.log('Failed to send file error message to staff room:', e.message))
        }
        
      }
    }
  } catch (e) {
    console.log('failed to send staff message to user room:', e.message)
  }
}