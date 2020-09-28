const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  try {
    if (req.body.resource === 'messages' && req.body.event === 'created') {
      // new messages
      console.log(req.body)
      // find the related user
      const user = await oauth2.getUser({appId: req.body.appId})
      // ignore messages from this user
      if (user.id === req.body.data.personId) {
        return
      }
      // get the actual message content
      const message = await webex(user.token.access_token).messages.get(req.body.data.id)
      // console.log('retrieved message for', user.personEmail, ':', message)
      if (req.body.data.roomType === 'group') {
        // room message
        const userRoom = user.rooms.find(v => v.userRoomId === message.roomId)
        const staffRoom = user.rooms.find(v => v.staffRoomId === message.roomId)
        if (userRoom) {
          // message from user in users room
          await webex(user.token.access_token).messages.create({
            roomId: userRoom.staffRoomId,
            text: `${message.personEmail} said ${message.text}`
          })
        } else if (staffRoom) {
          // message from staff in staff room
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
