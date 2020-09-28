const express = require('express')
const router = express.Router()
const model = require('../models/oauth2')

// save client access code
router.post('/', async (req, res, next) => {
  try {
    // get access token from webex
    await model.getAccessToken({
      user: req.body.user,
      code: req.body.code,
      redirectUri: req.headers.referer.split('?')[0]
    })
    return res.status(200).send()
  } catch (e) {
    console.log(`Failed to save oauth2 access token:`, e.message)
    return res.status(500).send(e.message)
  }
})

module.exports = router
