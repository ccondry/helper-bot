const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')
const handleDirectMessage = require('../models/handlers/direct-message')
const handleDirectRoomMessage = require('../models/handlers/direct-room-message')
const handleUserMessage = require('../models/handlers/user-message')
const handleStaffMessage = require('../models/handlers/staff-message')
const crypto = require('crypto')
const pkg = require('../../package.json')
// cache of already-received messages
const cache = {}

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  // console.log('webhook headers', req.headers)
  // copy request body
  const event = JSON.parse(JSON.stringify(req.body))

  // if this message was created by this bot
  if (event.createdBy === event.data.personId) {
    // ignore it
    console.log('ignoring webhook event', event.id, 'because it was my own bot message.')
    return res.status(200).send()
  } else if (event.event === 'created' && cache[event.data.id]) {
    // else if we have already received this webhook event
    // ignore it
    console.log('ignoring message created webhook event', event.id, 'because we already received it.')
    return res.status(200).send()
  } else {
    // continue processing event
    console.log('webhook event', event)
  }

  // get webhook user details
  let user
  try {
    // find the related user
    user = await oauth2.getUser({personId: event.createdBy})
    // console.log('this message is for', user)
  } catch (e) {
    // database operation failed
    const message = 'webhook failed during lookup of webhook user: ' + e.message
    console.log(pkg.name, pkg.version, message)
    return res.status(500).send()
  }
  if (!user) {
    // user not found
    const message = 'no matching webhook user found for personId ' + event.createdBy
    console.log(pkg.name, pkg.version, message)
    return res.status(400).send()
  }

  // validate signature/hash
  try {
    // get signature from webex
    const signature = req.headers['x-spark-signature']
    // hash the request body with sha1 using the webhook user's secret
    const hash = crypto.createHmac('sha1', user.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex')
    // check webex signature vs our hash
    if (signature !== hash) {
      // invalid signature or hash
      const message = 'webhook hash check failed for personId ' + event.createdBy
      console.log(pkg.name, pkg.version, message)
      return res.status(400).send()
    }
  } catch (e) {
    console.log('Invalid request signature in x-spark-signature')
    return res.status(400).send()
  }

  // check resource and event type
  if (event.resource !== 'messages') {
    console.log('ignoring non-messsage event with resource type', event.resource)
    // ignore non-messages
    return res.status(200).send()
  }

  // get the message details for created or updated events (not deleted ones)
  if (event.event === 'created' || event.event === 'updated') {
    try {
      console.log('getting full message details for created or updated event', event.id)
      event.data = await webex(user.token.access_token).messages.get(event.data.id)
    } catch (e) {
      // failed to get message details
      const message = `webhook failed to get message details: ${e.message}`
      console.log(pkg.name, pkg.version, message)
      return res.status(500).send()
    }
  }
    
  // if the message was a direct 1-1 message
  if (event.data.roomType !== 'group') {
    // direct 1-1 message from the user
    console.log('direct user message to the bot')
    // does this webhook user have a 1-1 room defined?
    if (!user.directRoomId) {
      // no direct room defined for this webhook user
      console.log(`webhook user ${user.personEmail} does not have directRoomId defined. ignoring 1-1 message.`)
      // ignore 1-1 messages for this webhook user
      return res.status(200).send()
    }
    try {
      // handle the direct message
      await handleDirectMessage(user, event)
      // add handled message to event cache
      cache[event.data.id] = true
      // done
      return res.status(200).send()
    } catch (e) {
      // failed during handle user message
      const message = `failed to handle direct message to webhook user ${user.personEmail}: ${e.message}`
      console.log(pkg.name, pkg.version, message)
      return res.status(500).send()
    }
  }

  if (
    // was this a message sent from staff/admins to the direct messages room?
    event.data.roomId === user.directRoomId ||
    // or sent to one of the other staff rooms that can respond directly to users?
    (
      Array.isArray(user.otherDirectRoomIds) &&
      user.otherDirectRoomIds.includes(event.data.roomId)
    )
  ) {
    // message is from staff/admins in direct messages room
    console.log('direct room message')
    // is this a message we should handle?
    if (
      // if this is a deleted message event
      event.event === 'deleted' ||
      (
        // or if mentionedPeople is an array
        Array.isArray(event.data.mentionedPeople) &&
        // and it contains this bot user
        event.data.mentionedPeople.includes(user.personId)
      )
    ) {
      try {
        // handle the message
        await handleDirectRoomMessage(user, event)
        // add handled message to event cache
        cache[event.data.id] = true
        // done
        return res.status(200).send()
      } catch (e) {
        // failed during handle staff message
        const message = `failed to handle webhook message to direct room ${event.data.roomId}: ${e.message}`
        console.log(pkg.name, pkg.version, message)
        return res.status(500).send()
      }
    } else {
      // ignore staff/admin messages that do not @ me
      return res.status(200).send()
    }
  }

  // find the matching room set for this user
  const userRoomSet = user.rooms.find(v => v.userRoomId === event.data.roomId)
  if (userRoomSet) {
    console.log('user room message for user room set', userRoomSet)
    try {
      // handle the user message
      await handleUserMessage(user, event, userRoomSet)
      // add handled message to event cache
      cache[event.data.id] = true
      // done
      return res.status(200).send()
    } catch (e) {
      // failed during handle user message
      const message = `failed to handle webhook message to user room ${event.data.roomId}: ${e.message}`
      console.log(pkg.name, pkg.version, message)
      return res.status(500).send()
    }
  }
  // message not sent to a user room

  // was message sent to a staff room?
  const staffRoomSet = user.rooms.find(v => v.staffRoomId === event.data.roomId)
  if (staffRoomSet) {
    console.log('staff room message for user room set', staffRoomSet)
    // message is from staff in staff room
    // did message mention this user?
    if (
      // if this is a deleted message event
      event.event === 'deleted' ||
      (
        // or if mentionedPeople is an array
        Array.isArray(event.data.mentionedPeople) &&
        // and it contains this bot user
        event.data.mentionedPeople.includes(user.personId)
      )
    ) {
      try {
        await handleStaffMessage(user, event, staffRoomSet)
        // add handled message to event cache
        cache[event.data.id] = true
        // done
        return res.status(200).send()
      } catch (e) {
        // failed during handle staff message
        const message = `failed to handle webhook message to staff room ${event.data.roomId}: ${e.message}`
        console.log(pkg.name, pkg.version, message)
        return res.status(500).send()
      }
    } else {
      // ignore messages that do not @ me
      return res.status(200).send()
    }
  }

  // message was not sent to staff or user rooms
  const message = `webhook event ${event.id} from ${event.data.personId} with message ID ${event.data} did not match any rooms for ${user.personEmail}`
  console.log(pkg.name, pkg.version, message)
  // return 200 OK to webex though
  return res.status(200).send()
})

module.exports = router
