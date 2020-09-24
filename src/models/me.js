const webex = require('./webex')
const package = require('../../package.json')
const cache = {}

module.exports = {
  async get () {
    try {
      if (!cache.me) {
        cache.me = await webex.people.get('me')
        console.log(`${package.name} authenticated to Webex Teams as bot ${cache.me.displayName}`)
      }
      return cache.me
    } catch (e) {
      throw Error(`${package.name} could not authenticate to Webex Teams: ${e.message}`)
    }
  }
}

