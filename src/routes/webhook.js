const express = require('express')
const router = express.Router()
const webex = require('../models/webex')
const oauth2 = require('../models/oauth2')

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  try {
    // just log for now
    // console.log(req.headers, req.body)
    // new messages
    if (req.body.resource === 'messages' && req.body.event === 'created') {
      const accessToken = oauth2.getAccessToken({user: 'cotycondry@gmail.com'})
      const message = await webex(accessToken.access_token).messages.get(req.body.data.id)
      console.log('retrieved message', message)
    }
    return res.status(200).send()
  } catch (e) {
    console.log(`Failed to handle webex webhook:`, e.message)
    return res.status(500).send(e.message)
  }
})

module.exports = router
