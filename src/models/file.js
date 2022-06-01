const fetch = require('node-fetch')
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getFilename (response) {
  // get content disposition
  const disposition = response.headers.get('content-disposition')
  // console.log('file disposition', disposition)
  // find the attachment part
  const parts = disposition.split(';')
  const index = parts.findIndex(v => v.trim() === 'attachment')
  // get filename string with quotes
  const filename = parts[index + 1].split('=')[1]
  // remove quotes
  const trimmedFilename = filename.slice(1, -1)
  // decode from URI encodingv4
  return decodeURIComponent(trimmedFilename).replace(/\+/g, ' ')
}

module.exports = {
  getFilename,
  async get (url, token) {
    console.log('file.get', url)
    let response
    try {
      // get file
      const options = {
        headers: {
          Authorization: 'Bearer ' + token
        }
      }
      
      let retryCount = 0
      const maxRetries = 10
      while (retryCount < maxRetries) {
        response = await fetch(url, options)
        if (response.status === 423) {
          console.log('got 423 - waiting for file to be available on webex server')
          await sleep(30 * 1000)
        } else if (response.status === 429) {
          // too many requests - wait until Retry-After 
          retryAfter = response.headers.get('Retry-After')
          console.log('retryAfter', retryAfter)
          await sleep(Number.parseInt(retryAfter, 10))
        } else if (!response.ok) {
          const text = await response.text()
          throw Error(`${response.status} ${response.statusText} - ${text}`)
        }
      }
    } catch (e) {
      throw e
    }
    try {
      // did we get redirected to another place, like for a GIF?
      if (response.redirected) {
        console.log('file.get found a redirect URL to', response.url)
        return response.url
      } else {
        // return the response file object with file content as buffer
        return {
          filename: getFilename(response),
          contentType: response.headers.get('content-type'),
          content: await response.buffer()
        }
      }
    } catch (e) {
      console.log('failed to upload/write file:', e.message)
      throw Error('Failed to upload file attachment')
    }
  }
}