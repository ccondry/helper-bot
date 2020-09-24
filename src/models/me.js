const webex = require('./webex')

const cache = {}

module.exports = {
  async get () {
    try {
      if (!cache.me) {
        cache.me = await webex.people.get('me')
        console.log(`${process.env.npm_package_name} authenticated to Webex Teams as bot ${cache.me.displayName}`)
      }
      return cache.me
    } catch (e) {
      throw Error(`${process.env.npm_package_name} could not authenticate to Webex Teams: ${e.message}`)
    }
  }
}

