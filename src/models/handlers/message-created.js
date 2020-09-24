const handleUserMessage = require('./user-message')
const handleStaffMessage = require('./staff-message')
const me = require('../me')

// received message
module.exports = async function (event) {
  try {
    const myId = (await me.get()).id
    // ignore messages sent from this bot
    if (event.data.personId === myId) {
      return
    }
    // logWebsocket(event)
    if (event.data.roomId === process.env.USER_ROOM_ID) {
      // message came from user support room
      return handleUserMessage(event)
    } else if (event.data.roomId === process.env.STAFF_ROOM_ID) {
      // message came from staff room
      return handleStaffMessage(event)
    } else {
      // unknown room
      console.log('message from unknown room:', event)
    }
  } catch (e) {
    console.log(e)
  }
}