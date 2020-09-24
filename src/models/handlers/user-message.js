const webex = require('../webex')
const threads = require('../threads')
const getFile = require('../file').get

module.exports = async function  (event) {
  // forward each file attachment as a new file message
  // since we can only send 1 file at a time with REST API
  if (event.data.files) {
    for (const file of event.data.files) {
      // forwardUserFile(event.data.personEmail, file, process.env.STAFF_ROOM_ID)
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
  const thread = threads.find(v => v.userThreadId === event.data.parentId)
  if (thread) {
    // message from a thread - map to thread in staff room
    data.parentId = thread.staffThreadId
  }
  // forward the first attached file, if any
  if (event.data.files && event.data.files.length) {
    // download file and get publicly-accessible link for the file
    const fileUrl = await getFile(event.data.files[0])
    // send file link in teams message
    data.files = fileUrl
    // did they send only files, no text? change the message sent to staff
    if (event.data.text.length === 0) {
      data.text = `${event.data.personEmail} sent this file`
      delete data.markdown
    }
  }

  // send message to staff room
  try {
    const response = await webex.messages.create(data)
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
    if (event.data.files && event.data.files.length > 1) {
      // remove the first file we already sent
      event.data.files.shift()
      // send the rest of the files as separate messages
      for (const file of event.data.files) {
        // download file and get publicly-accessible link for the file
        const fileUrl = await getFile(file)
        // remove markdown from previous data
        delete data.markdown
        // send message with file attachment
        data.files = fileUrl
        data.text = `${event.data.personEmail} also sent this file`
        webex.messages.create(data)
        .catch(e => {
          console.log(`failed to send user ${event.data.personEmail} file ${file} to support room:`, e.message)
        })
      }
    }
  } catch (e) {
    console.log('failed to send user message to staff room:', e.message)
  }
}