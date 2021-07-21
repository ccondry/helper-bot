// webex client
const webex = require('../webex')
// threads cache
const threads = require('../threads')
// download file from webex and save locally. returns our public URL for file
const file = require('../file')

module.exports = async function (user, event, rooms) {
  // did the staff delete their message?
  if (event.event === 'deleted') {
    // console.log('deleted event data:', event.data)
    const t = threads.find(v => v.staffThreadId === event.data.id)
    if (!t) {
      // we dont have a record of this thread. can't delete the message.
      return
    }
    // get the matching user room message
    const userRoomMessage = await webex(user.token.access_token).messages.get(t.userThreadId)
    // delete the matching message in the staff rooom
    webex(user.token.access_token).messages.remove(userRoomMessage)
    .catch(e => console.log('Failed to delete staff message from the user room:', e.message))
    // done
    return
  }

  // parse the html output to nice markdown with the mention to this bot removed
  // and any emails turned into real mentions
  let markdown
  try {
    const mentionRegex = /<spark-mention.*<\/spark-mention>/g
    const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    markdown = event.data.html.replace(mentionRegex, '').replace(emailRegex, '<@personEmail:$&>').trim()
  } catch (e) {
    // continue
  }

  // copy the plain text message from the event
  const text = event.data.text
  
  // sending message to user room
  const data = {
    roomId: rooms.userRoomId,
    text,
    markdown
  }
  // attach thread parent ID, if found
  const thread = threads.find(v => v.staffThreadId === event.data.parentId)
  if (thread) {
    // message from a thread - map to thread in staff room
    data.parentId = thread.userThreadId
  }

  // did the staff update their message?
  if (event.event === 'updated') {
    console.log('updated event data:', event.data)
    const t = threads.find(v => v.staffThreadId === event.data.id)
    if (!t) {
      console.log('didnt find matching user message from staff. threads:', threads)
      // we dont have a record of this thread. can't update the message.
      return
    }
    // get the matching user room message
    const userRoomMessage = await webex(user.token.access_token).messages.get(t.userThreadId)
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

  // send message to user room
  try {
    // send message
    const response = await webex(user.token.access_token).messages.create(data)
    // save thread if it doesn't exist yet
    if (!thread) {
      // thread parent ID for user room
      const userThreadId = response.id
      // thread parent ID for staff room
      const staffThreadId = event.data.parentId ? event.data.parentId : event.data.id
      // add thread to cache
      threads.push({
        userThreadId,
        staffThreadId
      })
    }
    // more files to send?
    if (Array.isArray(event.data.files) && event.data.files.length > 1) {
      // remove previous data properties
      delete data.markdown
      delete data.text
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
        webex(user.token.access_token).messages.create(data)
        .catch(e => {
          console.log(`failed to send staff ${event.data.personEmail} file ${file} to user room:`, e.message)
        })
      }
    }
  } catch (e) {
    console.log('failed to send staff message to user room:', e.message)
  }
}