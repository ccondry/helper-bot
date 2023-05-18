// webex client library
const Webex = require('webex')
// webex file uploader
const upload = require('./upload')
// fetch
const fetch = require('node-fetch')
// crypto (for uuid)
// const crypto = require('crypto')
// nanoid for uuid
const Nanoid = require('nanoid')

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
const retryThrottle = 60

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
  // const uuid = crypto.randomUUID()
  const uuid = Nanoid.nanoid()
  console.log('retry request uuid', uuid)
  const type = types.find(t => t.name === typeName)
  if (!type) {
    throw Error(`"${typeName}" is not a valid type name. use one of: ${types.map(t => t.name).split(', ')}`)
  }
  if (!type.validOperations.includes(operation)) {
    throw Error(`"${operation}" is not a valid operation. use one of: ${type.validOperations.split(', ')}`)
  }
  console.log(uuid, `trying webex.${typeName}.${operation} with data:`, data)
  let retryCount = 0
  let lastError
  while (retryCount < maxRetries) {
    try {
      // try operation
      // if uploading a file buffer
      if (typeName === 'messages' && operation === 'create' && Array.isArray(data.files) && data.files.length > 0 && typeof data.files[0] !== 'string') {
        // use special message file sender/uploader
        const response = await upload({token, data})
        console.log(uuid, `successful ${operation} webex ${typeName} on retry ${retryCount} of ${maxRetries}`)
        return response
      } else {
        // all other operations
        let url = 'https://webexapis.com/v1/' + typeName
        // map operations to HTTP method
        const methods = {
          'create': 'POST',
          'get': 'GET',
          'remove': 'DELETE',
          'update': 'PUT'
        }
        const options = {
          method: methods[operation],
          headers: {
            Authorization: 'Bearer ' + token
          }
        }
        // set body and content type if needed
        if (['POST', 'PUT'].includes(options.method)) {
          options.headers['Content-Type'] = 'application/json'
          options.body = JSON.stringify(data)
        }
        // append id to URL for GET and DELETE
        if (['GET', 'DELETE'].includes(options.method)) {
          url += '/' + data
        }

        console.log(uuid, 'fetch', url, options)
        const response = await fetch(url, options)
        let retryAfter = 0
        if (response.ok) {
          console.log(uuid, `successful ${operation} webex ${typeName} on retry ${retryCount} of ${maxRetries}`)
          const text = await response.text()
          // return JSON response if it was JSON data
          try {
            const json = JSON.parse(text)
            return json
          } catch (e) {
            // otherwise return plain text
            return text
          }
        } else if (response.status === 429) {
          // too many requests - wait until Retry-After 
          retryAfter = Number.parseInt(response.headers.get('Retry-After'), 10)
          console.log('test', uuid, 'retryAfter', retryAfter)
        } else if (response.status === 404) {
          // don't retry on 404
          break
        } else {
          let text
          try {
            text = await response.text()
          } catch (e) {
            // continue?
          }
          const error = Error(`${response.status} ${response.statusText} - ${text}`)
          console.log(uuid, `warning: failed to webex.${typeName}.${operation} on retry ${retryCount} of ${maxRetries}. retry again in ${retryThrottle} seconds. error message: ${error.message}`)
          lastError = error
        }
        // wait to retry
        if (retryAfter > 0) {
          console.log(uuid, 'await sleep retryAfter', retryAfter)
          await sleep(retryAfter * 1000)
        } else {
          console.log(uuid, 'await sleep retryThrottle', retryThrottle)
          await sleep(retryThrottle * 1000)
        }
        console.log(uuid, 'done sleeping')
        // increment counter
        retryCount++
        // continue loop iteration to retry
        continue
      }
    } catch (e) {
      console.log(uuid, `warning: failed to ${operation} webex ${typeName} on retry ${retryCount} of ${maxRetries}. retry again in ${retryThrottle} seconds. error message: ${e.message}`)
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
  console.log(uuid, `error: failed to ${operation} webex ${typeName} after all ${maxRetries} retries. last error message was: ${lastError.message}`)
  throw lastError
}

module.exports = retry