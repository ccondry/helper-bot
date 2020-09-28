const fetch = require('./fetch')
const db = require('./db')
const webex = require('./webex')

const collection = 'user'
const database = 'helper'

// wait time in milliseconds between checking all tokens
const throttle = 20 * 1000

// run now
interval()

// run every interval
setInterval(interval, throttle)

async function interval () {
  const users = await db.find(database, collection)
  for (const user of users) {
    const token = user.token
    // expiring soon?
    const now = new Date()
    const nowSeconds = Math.round(now.getTime() / 1000)
    // number of seconds before refresh expires when we should perform refresh
    const refreshBefore = Math.round(token.expires_in / 14)
    // time after which refresh should be done
    const refreshTime = token.created + token.expires_in - refreshBefore
    // refresh?
    if (nowSeconds > refreshTime) {
      // it is refresh time
      console.log(`token for ${user.personEmail} needs to be refreshed. refreshing now...`)
      // refesh the token with webex APIs
      let newToken
      try {
        newToken = await model.refreshToken(token.refresh_token)
        console.log(`token for ${user.personEmail} refreshed successfully:`, newToken)
      } catch (e) {
        console.log(`token for ${user.personEmail} failed to refresh:`, e.message)
        return
      }
      // update database with new token details
      try {
        const query = {_id: db.ObjectId(user._id)}
        newToken.created = Math.round(now.getTime() / 1000)
        const updates = {$set: {token: newToken}}
        await db.updateOne(database, collection, query, updates)
      } catch (e) {
        console.log(`token for ${user.personEmail} failed to refresh:`, e.message)
        return
      }
    } else {
      // it is not refresh time yet
      // how many seconds before we need to refresh
      const secondsLeft = refreshTime - nowSeconds
      // minutes before we need to refresh
      let minutes = Math.round(secondsLeft / 60)
      if (minutes > 60) {
        let hours = Math.floor(minutes / 60)
        minutes = minutes % 60
        if (hours > 24) {
          const days = Math.floor(hours / 24)
          hours = hours % 60
          console.log(`token for ${user.personEmail} does not need to be refreshed yet. It will in ${days} days, ${hours} hours, and ${minutes} minutes`)
        } else {
          console.log(`token for ${user.personEmail} does not need to be refreshed yet. It will in ${hours} hours and ${minutes} minutes`)
        }
      } else {
        console.log(`token for ${user.personEmail} does not need to be refreshed yet. It will in ${minutes} minutes`)
      }
    }
  }
}

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
  async getUser (query) {
    return db.findOne(database, collection, query)
  },
  async authorize ({code, redirectUri, appId, userRoomId, staffRoomId}) {
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
    try {
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
      // get user data associated with this access token
      const me = await webex(accessToken.access_token).people.get('me')
      // store user and token in database
      await db.insertOne(database, collection, {
        personEmail: me.emails[0],
        personId: me.id,
        appId,
        rooms: [{userRoomId, staffRoomId}],
        token: accessToken
      })
      return
    } catch (e) {
      throw e
    }
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