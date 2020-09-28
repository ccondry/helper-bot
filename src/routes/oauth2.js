const express = require('express')
const router = express.Router()
const model = require('../models/oauth2')

// save client access code
router.post('/', async (req, res, next) => {
  try {
    // get and store access token from webex
    await model.authorize({
      code: req.body.code,
      redirectUri: req.headers.referer.split('?')[0],
      userRoomId: req.body.userRoomId,
      staffRoomId: req.body.staffRoomId
    })
    return res.status(200).send({message: 'You have successfully authorized this application with Webex Teams.'})
  } catch (e) {
    console.log(`Failed to save oauth2 access token:`, e.message)
    return res.status(500).send({message: 'There was an error creating authorized this application with Webex Teams: ' + e.message})
  }
})

module.exports = router
