const express = require('express')
const router = express.Router()
const model = require('../models/oauth2')

// save client access code
router.post('/', async (req, res, next) => {
  try {
    // TODO get user from JWT or something
    const existing = await model.getUser({personEmail: req.body.user})
    if (existing && existing.token && existing.token.refresh_token) {
      // try to refresh their token now to make sure it's good
      try {
        await model.refreshToken(existing.token.refresh_token)
        return res.status(200).send({message: 'Your access token already exists and has been refreshed successfully.'})
      } catch (e) {
        // continue
      }
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
