const express = require('express')
const router = express.Router()
const pkg = require('../../package.json')

// get the version of this software
router.get('/', async (req, res, next) => {
  try {
    return res.status(200).send({version: pkg.version})
  } catch (e) {
    console.log(`Failed to get server info:`, e.message)
    return res.status(500).send({message: e.message})
  }
})

module.exports = router
