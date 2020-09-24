// webex client
const webex = require('../webex')
// threads cache
const threads = require('../threads')
// download file from webex and save locally. returns our public URL for file
const file = require('../file')

module.exports = async function (event) {
  // parse the html output to nice markdown with the mention to this bot removed
  // and any emails turned into real mentions
  const mentionRegex = /<spark-mention.*<\/spark-mention>/g
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
  const markdown = event.data.html.replace(mentionRegex, '').replace(emailRegex, '<@personEmail:$&>').trim()

  const data = {
    roomId: process.env.USER_ROOM_ID,
    markdown
  }
  // attach thread parent ID, if found
  const thread = threads.find(v => v.staffThreadId === event.data.parentId)
  if (thread) {
    // message from a thread - map to thread in staff room
    data.parentId = thread.userThreadId
  }
  // forward the first attached file, if any
  if (event.data.files && event.data.files.length) {
    // download file and get publicly-accessible link for the file
    const fileUrl = await file.get(event.data.files[0])
    // send file link in teams message
    data.files = fileUrl
  }
  // send message to user room
  try {
    // send message
    const response = await webex.messages.create(data)
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
    if (event.data.files && event.data.files.length > 1) {
      // remove the first file we already sent
      event.data.files.shift()
      // send the rest of the files as separate messages
      for (const file of event.data.files) {
        // download file and get publicly-accessible link for the file
        const fileUrl = await getFile(file)
        // remove previous data properties
        delete data.markdown
        delete data.text
        // send message with file attachment
        data.files = fileUrl
        webex.messages.create(data)
        .catch(e => {
          console.log(`failed to send staff ${event.data.personEmail} file ${file} to user room:`, e.message)
        })
      }
    }
  } catch (e) {
    console.log('failed to send staff message to user room:', e.message)
  }
}