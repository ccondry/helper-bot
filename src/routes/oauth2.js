const express = require('express')
const router = express.Router()
const model = require('../models/oauth2')

const cache = {}

// wait time in seconds between checking all tokens for refresh timer
const throttle = 5 * 1000

// number of seconds before refresh expires when we should perform refresh
const refreshBefore = 60 * 60 * 24

setInterval(async function () {
  const keys = Object.keys(cache)
  for (const key of keys) {
    const value = cache[key]
    // expiring soon?
    const now = new Date()
    const nowSeconds = Math.round(now.getTime() / 1000)
    // console.log('nowSeconds =', nowSeconds)
    // console.log('maxAge =', maxAge)
    // console.log('expires + created =', value.expires_in + value.created)
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

// save client access code
router.post('/', async (req, res, next) => {
  try {
    // console.log('req.url =', req.url)
    // console.log('req.baseUrl =', req.baseUrl)
    // console.log('req.originalUrl =', req.originalUrl)
    console.log('req.headers.host =', req.headers.host)
    console.log('req.body =', req.body)
    const accessToken = await model.getAccessToken({
      code: req.body.code,
      redirectUri: 'https://mm-helper.cxdemo.net/oauth2/'
    })
    console.log(accessToken)
    // set created time in seconds
    const now = new Date()
    accessToken.created = Math.round(now.getTime() / 1000)
    cache[req.body.user] = accessToken
    return res.status(200).send()
  } catch (e) {
    console.log(`Failed to save oauth2 access token:`, e.message)
    return res.status(500).send(e.message)
  }
})

module.exports = router
