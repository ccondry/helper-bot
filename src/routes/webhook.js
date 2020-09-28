const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  try {
    // new messages
    if (req.body.resource === 'messages' && req.body.event === 'created') {
      if (req.body.data.roomType === 'group') {
        // room message
        // find the related user
        const user = await oauth2.getUser({appId: req.body.appId, roomId: req.body.data.roomId})
        // and get their access token
        const accessToken = user.token
        // and get the actual message content
        const message = await webex(accessToken.access_token).messages.get(req.body.data.id)
        console.log('retrieved message', message)
      } else {
        // direct message
        // ignore for now
      }
    }
    return res.status(200).send()
  } catch (e) {
    console.log(`Failed to handle webex webhook:`, e.message)
    return res.status(500).send(e.message)
  }
})

module.exports = router
