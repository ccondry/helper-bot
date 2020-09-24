
module.exports = async function  (event) {
  // logWebsocket(event)
  try {
    const room = await getRoom(event.data.roomId)
    console.log(`${event.data.personDisplayName} (${event.data.personEmail}) was added to ${room.title} ${room.isModerator ? 'as a moderator' : ''}`)
  } catch (e) {
    console.log(e)
  }
}
