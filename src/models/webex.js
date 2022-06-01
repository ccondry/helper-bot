// webex client library
const Webex = require('webex')
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// max number of retries before giving up
const maxRetries = 10

// operations we have defined
const validOperations = ['get', 'create', 'remove']
const validTypes = ['messages', 'people']

// cache of webex clients
let clients = {}

// how many seconds to wait before retrying
const retryThrottle = 5

// get an initialized webex client library object from cache if available
function webex (accessToken) {
  // init client library if it has not been done yet for this token
  if (!clients[accessToken]) {
    clients[accessToken] = Webex.init({
      credentials: {
        access_token: accessToken
      }
    })
  }
  // return the initialized client lib
  return clients[accessToken]
}

// retry operation
async function retry (type, operation, {data, token}) {
  if (!validTypes.includes(type)) {
    throw Error(`"${type}" is not a valid type. use one of: ${validTypes.split(', ')}`)
  }
  if (!validOperations.includes(operation)) {
    throw Error(`"${operation}" is not a valid operation. use one of: ${validOperations.split(', ')}`)
  }
  let retryCount = 0
  let lastError
  while (retryCount < maxRetries) {
    try {
      // try operation
      const response = await webex(token)[type][operation](data)
      console.log(`successful ${operation} webex ${type} on retry ${retryCount} of ${maxRetries}`)
      return response
    } catch (e) {
      console.log(`warning: failed to ${operation} webex ${type} on retry ${retryCount} of ${maxRetries}. retry again in ${retryThrottle} seconds. error message: ${e.message}`)
      lastError = e
      // wait before retrying again
      await sleep(retryThrottle * 1000)
      // increment counter
      retryCount++
      // continue loop iteration to retry
      continue
    }
  }
  // failed after all retries
  console.log(`error: failed to ${operation} webex ${type} after all ${maxRetries} retries. last error message was: ${lastError.message}`)
  throw lastError
}

module.exports = function (token) {
  return {
    messages: {
      get: data => retry('messages', 'get', {data, token}),
      create: data => retry('messages', 'create', {data, token}),
      remove: data => retry('messages', 'remove', {data, token})
    },
    people: {
      get: data => retry('people', 'remove', {data, token})
    }
  }
}