const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')
const handleUserMessage = require('../models/handlers/user-message')
const handleStaffMessage = require('../models/handlers/staff-message')
const crypto = require('crypto')

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  try {
    // validate secret
    const signature = req.headers['x-spark-signature']
    // hash the request body with sha1 using our secret
    const hash = crypto.createHmac('sha1', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')

    if (signature !== hash) {
      return res.status(400).send({message: 'Invalid request signature in x-spark-signature'})
    }
    if (req.body.resource === 'messages' && req.body.event === 'created') {
      // new messages
      console.log('new message', req.body)
      // find the related user
      const user = await oauth2.getUser({personId: req.body.createdBy})
      // ignore messages from this user
      if (req.body.createdBy === req.body.data.personId) {
        return res.status(200).send({})
      }
      // get the actual message content
      const message = await webex(user.token.access_token).messages.get(req.body.data.id)
      // replace body data with message
      const event = JSON.parse(JSON.stringify(req.body))
      event.data = message
      // debug
      console.log(event)
      // console.log('retrieved message for', user.personEmail, ':', message)
      if (event.data.roomType === 'group') {
        // room message
        const userRoomSet = user.rooms.find(v => v.userRoomId === event.data.roomId)
        const staffRoomSet = user.rooms.find(v => v.staffRoomId === event.data.roomId)
        if (userRoomSet) {
          // message from user in users room
          // await webex(user.token.access_token).messages.create({
          //   roomId: userRoom.staffRoomId,
          //   text: `${message.personEmail} said ${message.text}`
          // })
          handleUserMessage(user, event, userRoomSet)
        } else if (staffRoomSet) {
          // message from staff in staff room
          if (event.data.mentionedPeople && event.data.mentionedPeople.includes(user.personId)) {
            // only handle staff messages that @ me
            handleStaffMessage(user, event, staffRoomSet)
          } else {
            // ignore messages that do not @ me
          }
          // await webex(user.token.access_token).messages.create({
          //   roomId: staffRoom.userRoomId,
          //   text: message.text
          // })
        }
      } else {
        // direct message
      }
    }
    return res.status(200).send({})
  } catch (e) {
    console.log(`Failed to handle webex webhook:`, e.message)
    return res.status(500).send({message: e.message})
  }
})

module.exports = router
