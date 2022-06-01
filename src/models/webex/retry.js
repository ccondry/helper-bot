// webex client library
const Webex = require('webex')
// webex file uploader
const upload = require('./upload')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// max number of retries before giving up
const maxRetries = 10

// operations we have defined
const types = [
  {
    name: 'messages',
    validOperations: ['get', 'create', 'remove']
  }, {
    name: 'people',
    validOperations: ['get']
  }
]

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
async function retry (typeName, operation, {data, token}) {
  const type = types.find(t => t.name === typeName)
  if (!type) {
    throw Error(`"${typeName}" is not a valid type name. use one of: ${types.map(t => t.name).split(', ')}`)
  }
  if (!type.validOperations.includes(operation)) {
    throw Error(`"${operation}" is not a valid operation. use one of: ${type.validOperations.split(', ')}`)
  }
  console.log(`trying webex.${typeName}.${operation} with data:`, data)
  let retryCount = 0
  let lastError
  while (retryCount < maxRetries) {
    try {
      // try operation
      let response
      // if uploading a file buffer
      if (typeName === 'messages' && operation === 'create' && data.files.length > 0 && typeof data.files[0] !== 'string') {
        // use special message file sender/uploader
        response = await upload({token, data})
      } else {
        // otherwise use official webex lib
        response = await webex(token)[typeName][operation](data)
      }
      console.log(`successful ${operation} webex ${typeName} on retry ${retryCount} of ${maxRetries}`)
      return response
    } catch (e) {
      console.log(`warning: failed to ${operation} webex ${typeName} on retry ${retryCount} of ${maxRetries}. retry again in ${retryThrottle} seconds. error message: ${e.message}`)
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
  console.log(`error: failed to ${operation} webex ${typeName} after all ${maxRetries} retries. last error message was: ${lastError.message}`)
  throw lastError
}

module.exports = retry