// webex client library
const Webex = require('webex')

// init client library
const webex = Webex.init({
  credentials: {
    access_token: process.env.ACCESS_TOKEN
  }
})

module.exports = webex

