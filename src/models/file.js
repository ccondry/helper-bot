const fetch = require('node-fetch')

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
      response = await fetch(url, options)
      // const text = await response.text()
      if (!response.ok) {
        throw Error(`${response.status} ${response.statusText} - ${text}`)
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
        // return the response body stream
        const filename = getFilename(response)
        console.log('file.get found file data for filename', filename)
        // set path for webex library to see this like a fs.ReadStream class
        response.body.path = filename
        return response.body
      }
    } catch (e) {
      console.log('failed to upload/write file:', e.message)
      throw Error('Failed to upload file attachment')
    }
  }
}