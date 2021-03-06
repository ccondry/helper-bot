const webex = require('../webex')
const threads = require('../threads')
const file = require('../file')
// const me = require('../me')

module.exports = async function (user, event, rooms) {
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
  if (typeof html === 'string' && typeof text === 'string' && html.length > text.length + 8) {
    data.markdown = `${event.data.personEmail} said ${html}`
  }
  const thread = threads.find(v => v.userThreadId === event.data.parentId)
  if (thread) {
    // message from a thread - map to thread in staff room
    data.parentId = thread.staffThreadId
  }
  // forward the first attached file, if any
  if (Array.isArray(event.data.files) && event.data.files.length) {
    // remove the first file from event data and get the file data
    const file1 = event.data.files.shift()
    // download file and get publicly-accessible link for the file
    try {
      const fileUrl = await file.get(file1, user.token.access_token)
      // send file link in teams message
      data.files = fileUrl
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