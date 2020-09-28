require('../src')
const package = require('../package.json')
const fetch = require('../src/models/fetch')
// base URL path to this service
const baseUrl = 'http://localhost:' + process.env.NODE_PORT + '/api/v1'

// get version info
describe('version', function () {
  it('should return this software version', async function () {
    const url = baseUrl + '/version'
    try {
      const response = await fetch(url)
      if (response.version = package.version) {
        return response
      } else {
        // incorrect data? maybe response was empty?
        throw Error('response.version did not match package.version? response.version is ' + response.version )
      }
    } catch (e) {
      // non-HTTP error, like connection refused
      throw e
    }
  })
})

// get oauth2 access token
describe('oauth2', function () {
  it('should register an oauth2 client access code', async function () {
    return fetch(baseUrl + '/oauth2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grantType: 'authorization_code',
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        code: process.env.OAUTH_CODE,
        redirectUri: process.env.OAUTH_REDIRECT_URI
      })
    })
  })
})
