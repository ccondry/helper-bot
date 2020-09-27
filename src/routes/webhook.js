const express = require('express')
const router = express.Router()

// all webhook messages from webex
router.post('/*', async (req, res, next) => {
  try {
    // just log for now
    console.log(req.headers, req.body)
    return res.status(200).send()
  } catch (e) {
    console.log(`Failed to get server info:`, e.message)
    return res.status(500).send(e.message)
  }
})

module.exports = router
