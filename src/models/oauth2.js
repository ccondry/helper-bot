const fetch = require('./fetch')
const db = require('./db')
const webex = require('./webex')

// database parameters
const collection = 'user'
const database = 'helper'

// wait time in milliseconds between checking all tokens
// this is 1 hour
const throttle = 1000 * 60 * 60 * 1

// run token refresh check now
interval()

// run token refresh check every throttle milliseconds
setInterval(interval, throttle)

async function refreshToken (refreshToken) {
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

async function interval () {
  const users = await db.find(database, collection)
  for (const user of users) {
    const token = user.token
    // continue to next user if this user has no token defined
    if (!token) {
      continue
    }
    try {
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
          newToken = await refreshToken(token.refresh_token)
          console.log(`token for ${user.personEmail} refreshed successfully`)
        } catch (e) {
          console.log(`token for ${user.personEmail} failed to refresh:`, e.message)
          return
        }
        // update database with new token details
        try {
          const query = {_id: db.ObjectID(user._id)}
          newToken.created = Math.round(now.getTime() / 1000)
          const updates = {$set: {token: newToken}}
          await db.updateOne(database, collection, query, updates)
        } catch (e) {
          console.log(`token for ${user.personEmail} failed to refresh:`, e.message)
          return
        }
      } else {
        // // it is not refresh time yet
        // // how many seconds before we need to refresh
        // const secondsLeft = refreshTime - nowSeconds
        // // minutes before we need to refresh
        // let minutes = Math.round(secondsLeft / 60)
        // if (minutes > 60) {
        //   let hours = Math.floor(minutes / 60)
        //   minutes = minutes % 60
        //   if (hours > 24) {
        //     const days = Math.floor(hours / 24)
        //     hours = hours % 60
        //     console.log(`token for ${user.personEmail} does not need to be refreshed yet. It will in ${days} days, ${hours} hours, and ${minutes} minutes`)
        //   } else {
        //     console.log(`token for ${user.personEmail} does not need to be refreshed yet. It will in ${hours} hours and ${minutes} minutes`)
        //   }
        // } else {
        //   console.log(`token for ${user.personEmail} does not need to be refreshed yet. It will in ${minutes} minutes`)
        // }
      }
    } catch (e) {
      console.log('failed checking/updating token for user', user.personEmail, ':', e.message)
      continue
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
  async authorize ({code, redirectUri, rooms}) {
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
      // use first email address
      const myEmail = me.emails[0]
      // store user and token in database
      const data = {
        personEmail: myEmail,
        personId: me.id,
        displayName: me.displayName,
        nickName: me.nickName,
        token: accessToken,
        rooms: rooms || []
      }
      if (me.firstName) {
        data.firstName = me.firstName
      }
      if (me.firstName) {
        data.lastName = me.lastName
      }
      // find existing record
      const query = {personId: me.id}
      // check for existing record for this user
      const existing = await db.findOne(database, collection, query)
      if (existing) {
        // update existing
        // check that we are not overwriting all existing room associations with
        // the new one
        if (existing.rooms && existing.rooms.length) {
          // there are existing room(s) defined for this user
          for (const room of existing.rooms) {
            // insert the existing rooms into data, unless they already exist
            const found = data.rooms.findIndex(v => {
              return v.staffRoomId === room.staffRoomId ||
              v.userRoomId === room.userRoomId ||
              v.staffRoomId === room.userRoomId ||
              v.userRoomId === room.staffRoomId
            })
            if (found < 0) {
              // not found. add existing to update data.
              data.rooms.push(room)
            }
          }
        }
        // update user in database
        const updates = {$set: data}
        await db.updateOne(database, collection, query, updates)
      } else {
        // doesn't exist yet - insert new
        await db.insertOne(database, collection, data)
      }
      return
    } catch (e) {
      throw e
    }
  },
  refreshToken
}