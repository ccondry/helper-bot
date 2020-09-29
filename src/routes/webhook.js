const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')
const handleUserMessage = require('../models/handlers/user-message')
const handleStaffMessage = require('../models/handlers/staff-message')
const crypto = require('crypto')
const pkg = require('../../package.json')

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  // copy request body
  const event = JSON.parse(JSON.stringify(req.body))
  
  // ignore messages from self
  if (event.createdBy === event.data.personId) {
    return
  }

  // get webhook user details
  let user
  try {
    // find the related user
    user = await oauth2.getUser({personId: event.createdBy})
  } catch (e) {
    // database operation failed
    const message = 'webhook failed during lookup of webhook user: ' + e.message
    console.log(pkg.name, pkg.version, message)
    return res.status(500).send({message})
  }
  if (!user) {
    // user not found
    const message = 'no matching webhook user found for personId ' + event.createdBy
    console.log(pkg.name, pkg.version, message)
    return res.status(400).send({message})
  }

  // validate signature/hash
  try {
    // get signature from webex
    const signature = req.headers['x-spark-signature']
    // hash the request body with sha1 using the webook user's secret
    const hash = crypto.createHmac('sha1', user.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex')
    // check webex signature vs our hash
    if (signature !== hash) {
      // invalid signature or hash
      const message = 'webhook hash check failed for personId ' + event.createdBy
      console.log(pkg.name, pkg.version, message)
      return res.status(400).send({message})
    }
  } catch (e) {
    return res.status(400).send({message: 'Invalid request signature in x-spark-signature'})
  }

  // request validated
  // return OK to webhook sender and continue processing
  res.status(200).send({})

  // check resource and event type
  if (event.resource === 'messages' && event.event === 'created') {
    // messages.created
    try {
      // get the message details
      event.data = await webex(user.token.access_token).messages.get(event.data.id)
    } catch (e) {
      // failed to get message details
      const message = `webhook failed to get message details: ${e.message}`
      console.log(pkg.name, pkg.version, message)
      return
    }
    
    // was the message sent to a room or as a direct message?
    if (event.data.roomType === 'group') {
      // room message
      // find the matching room set for this user
      const userRoomSet = user.rooms.find(v => v.userRoomId === event.data.roomId)
      if (userRoomSet) {
        try {
          await handleUserMessage(user, event, userRoomSet)
          // done
          return
        } catch (e) {
          // failed during handle user message
          const message = `failed to handle webhook message to user room ${event.data.roomId}: ${e.message}`
          console.log(pkg.name, pkg.version, message)
          return
        }
      } else {
        // message not sent to a user room
        // was message sent to a staff room?
        const staffRoomSet = user.rooms.find(v => v.staffRoomId === event.data.roomId)
        if (staffRoomSet) {
          // message is from staff in staff room
          // did message mention this user?
          if (Array.isArray(event.data.mentionedPeople) && event.data.mentionedPeople.includes(user.personId)) {
            // only handle staff messages that @ me
            try {
              await handleStaffMessage(user, event, staffRoomSet)
              // done
              return
            } catch (e) {
              // failed during handle staff message
              const message = `failed to handle webhook message to staff room ${event.data.roomId}: ${e.message}`
              console.log(pkg.name, pkg.version, message)
              return
            }
          } else {
            // ignore messages that do not @ me
            return
          }
        } else {
          const message = `webhook room did not match any rooms for ${user.personEmail} (${user.personId})`
          console.log(pkg.name, pkg.version, message)
          return
        }
      }
    } else {
      // direct message - ignore for now
      return
    }
  } else {
    // resource.event is not messages.created - ignore for now
    return
  }
})

module.exports = router
