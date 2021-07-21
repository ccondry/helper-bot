const fetch = require('node-fetch')
// const fs = require('fs')
// const fsp = fs.promises
// const uuid = require('uuid')

// function getFilename (response) {
//   // get content disposition
//   const disposition = response.headers.get('content-disposition')
//   console.log('file disposition', disposition)
//   // find the attachment part
//   const parts = disposition.split(';')
//   const index = parts.findIndex(v => v.trim() === 'attachment')
//   // get filename string with quotes
//   const filename = parts[index + 1].split('=')[1]
//   // remove quotes
//   const trimmedFilename = filename.slice(1, -1)
//   // decode from URI encodingv4
//   return decodeURIComponent(trimmedFilename).replace(/\+/g, ' ')
// }

module.exports = {
  async get (url, token) {
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
      console.log('file response redirected', response.redirected)
      if (response.redirected) {
        // get redirect url
        // console.log('file response url', response.url)
        
        // get content type
        // console.log('file response content type', response.headers['content-type'])

        return response.url
      } else {
        console.log('get webex file attachment response headers:', response.headers)
        // return the response body stream
        return response.body
        // const filename = getFilename(response)
        // console.log('filename:', filename)
        // return {
        //   body: response.body,
        //   filename
        // }
      }
    } catch (e) {
      console.log('failed to upload/write file:', e.message)
      throw Error('Failed to upload file attachment')
    }
  }
}