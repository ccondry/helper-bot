// webex client library
const Webex = require('webex')

clients = {}

module.exports = function (accessToken) {
  // init client library if it has not been done yet for this token
  if (!clients[accessToken]) {
    clients[accessToken] = Webex.init({
      credentials: {
        access_token: accessToken
      }
    })
  }

  return clients[accessToken]
}

