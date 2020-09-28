const fetch = require('./fetch')

// convert JSON object to url encoded string
const urlEncode = function (params) {
  const keys = Object.keys(params)
  let ret = ''
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = params[key]
    if (i !== 0) {
      // not first one
      ret += '&'
    }
    ret += `${key}=${value}`
  }
  return ret
}

module.exports = {
  getAccessToken ({code, redirectUri}) {
    const body = {
      grant_type: 'authorization_code',
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    }
    const encodedBody = urlEncode(body)
    console.log('encodedBody =', encodedBody)
    return fetch('https://webexapis.com/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: encodedBody
    })
  },
  refreshToken (refreshToken) {
    const body = {
      grant_type: 'refresh_token',
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken
    }
    const encodedBody = urlEncode(body)
    return fetch('https://webexapis.com/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: encodedBody
    })
  }
}