const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')
const handleUserMessage = require('../models/handlers/user-message')
const handleStaffMessage = require('../models/handlers/staff-message')

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  try {
    if (req.body.resource === 'messages' && req.body.event === 'created') {
      // new messages
      // find the related user
      const user = await oauth2.getUser({personId: req.body.createdBy})
      // ignore messages from this user
      if (req.body.createdBy === req.body.data.personId) {
        return res.status(200).send()
      }
      // debug
      console.log(req.body)
      // get the actual message content
      const message = await webex(user.token.access_token).messages.get(req.body.data.id)
      // replace body data with message
      const event = JSON.parse(JSON.stringify(req.body))
      event.data = message
      // console.log('retrieved message for', user.personEmail, ':', message)
      if (event.data.roomType === 'group') {
        // room message
        const userRoom = user.rooms.find(v => v.userRoomId === event.data.roomId)
        const staffRoom = user.rooms.find(v => v.staffRoomId === event.data.roomId)
        if (userRoom) {
          // message from user in users room
          // await webex(user.token.access_token).messages.create({
          //   roomId: userRoom.staffRoomId,
          //   text: `${message.personEmail} said ${message.text}`
          // })
          handleUserMessage(event, userRoom.staffRoomId)
        } else if (staffRoom) {
          // message from staff in staff room
          handleStaffMessage(event, staffRoom.userRoomId)
          // await webex(user.token.access_token).messages.create({
          //   roomId: staffRoom.userRoomId,
          //   text: message.text
          // })
        }
      } else {
        // direct message
      }
    }
    return res.status(200).send()
  } catch (e) {
    console.log(`Failed to handle webex webhook:`, e.message)
    return res.status(500).send(e.message)
  }
})

module.exports = router
