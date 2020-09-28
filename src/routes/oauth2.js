const express = require('express')
const router = express.Router()
const model = require('../models/oauth2')

// save client access code
router.post('/', async (req, res, next) => {
  try {
    const existing = await model.getUserToken({user: req.body.user})
    if (existing) {
      return res.status(200).send({message: 'Your access token already exists and is valid.'})
    }
    // get access token from webex
    await model.authorize({
      // TODO get user from JWT or something
      user: req.body.user,
      code: req.body.code,
      redirectUri: req.headers.referer.split('?')[0]
    })
    return res.status(200).send({message: 'Your access token has been succesfully created.'})
  } catch (e) {
    console.log(`Failed to save oauth2 access token:`, e.message)
    return res.status(500).send({message: 'There was an error creating your access token: ' + e.message})
  }
})

module.exports = router
