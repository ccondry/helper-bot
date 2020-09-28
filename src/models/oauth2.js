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

const cache = {}

// wait time in milliseconds between checking all tokens
const throttle = 20 * 1000

setInterval(async function () {
  const keys = Object.keys(cache)
  for (const key of keys) {
    const value = cache[key]
    // expiring soon?
    const now = new Date()
    const nowSeconds = Math.round(now.getTime() / 1000)
    // number of seconds before refresh expires when we should perform refresh
    const refreshBefore = Math.round(value.expires_in / 14)
    // time after which refresh should be done
    const refreshTime = value.created + value.expires_in - refreshBefore
    // refresh?
    if (nowSeconds > refreshTime) {
      console.log(`token ${key} needs to be refreshed. refreshing now...`)
      // time to refresh
      try {
        const newToken = await model.refreshToken(value.refresh_token)
        console.log(`token ${key} refreshed successfully:`, newToken)
        newToken.created = Math.round(now.getTime() / 1000)
        // update cache with new token details
        cache[key] = newToken
      } catch (e) {
        console.log(`token ${key} failed to refresh:`, e.message)
      }
    } else {
      // how many seconds before we need to refresh
      const t = refreshTime - nowSeconds
      // minutes before we need to refresh
      const m = Math.round(t / 60)
      if (m > 60) {
        const h = Math.round(m / 60)
        if (h > 24) {
          const d = Math.round(h / 24)
          const hr = h % 24
          const mr = m % 60
          console.log(`token ${key} does not need to be refreshed yet. It will in ${d} days, ${hr} hours, and ${mr} minutes`)
        } else {
          const r = m % 60
          console.log(`token ${key} does not need to be refreshed yet. It will in ${h} hours and ${r} minutes`)
        }
      } else {
        console.log(`token ${key} does not need to be refreshed yet. It will in ${m} minutes`)
      }
    }
  }
}, throttle)

module.exports = {
  getAccessToken ({code, redirectUri}) {
    // build body object
    const body = {
      grant_type: 'authorization_code',
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    }
    // encode the body for x-www-form-urlencoded
    const encodedBody = urlEncode(body)
    // get the token from webex
    const accessToken = await fetch('https://webexapis.com/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: encodedBody
    })
    // set created time in seconds
    const now = new Date()
    accessToken.created = Math.round(now.getTime() / 1000)
    // store token in cache
    cache[req.body.user] = accessToken
    return
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