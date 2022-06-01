require('dotenv').config()
const file = require('../../src/models/file')
const webex = require('../../src/models/webex')
const fetch = require('node-fetch')

const url = process.env.TEST_FILE_URL
const token = process.env.TEST_TOKEN

async function main () {
  // get file data
  // const fileData = await file.get(url, token)
  const options = {
    headers: {
      Authorization: 'Bearer ' + token
    }
  }
  const response = await fetch(url, options)
  console.log('fetch response')
  if (response.ok) {
    console.log('getFilename(response)', file.getFilename(response))
    // send file link or ReadStream in teams message
    const data = {
      toPersonEmail: 'ccondry@cisco.com',
      text: 'test',
      files: [{
        filename: file.getFilename(response),
        contentType: response.headers.get('content-type'),
        content: await response.buffer()
      }]
    }
    return webex(token).messages.create(data)
  } else {
    console.log('get file response not OK')
  }
}

main(r => console.log(r)).catch(e => console.log(e))