const fetch = require('node-fetch')
const fs = require('fs')
const fsp = fs.promises
const { v4: uuidv4 } = require('uuid')

function getFilename (response) {
  // get content disposition
  const disposition = response.headers.get('content-disposition')
  // find the attachment part
  const parts = disposition.split(';')
  const index = parts.findIndex(v => v.trim() === 'attachment')
  // get filename string with quotes
  const filename = parts[index + 1].split('=')[1]
  // remove quotes
  const trimmedFilename = filename.slice(1, -1)
  // decode from URI encoding
  return decodeURIComponent(trimmedFilename).replace(/\+/g, ' ')
}

module.exports = {
  async get (url, options) {
    let response
    try {
      response = await fetch(url, options)
      // const text = await response.text()
      if (!response.ok) {
        throw Error(`${response.status} ${response.statusText} - ${text}`)
      }
    } catch (e) {
      throw e
    }
    try {
      const filename = getFilename(response)
      // console.log('filename:', filename)
      const id = uuidv4()
      await fsp.mkdir(id)
      const path = `${id}/${filename}`
      // const path = filename
      const fileUrl = `${process.env.FILE_HOST}/${filename}`
      const fileStream = fs.createWriteStream(path)
      await new Promise((resolve, reject) => {
        response.body.pipe(fileStream)
        response.body.on('error', reject)
        fileStream.on('finish', resolve)
      })
      // console.log('wrote file', path)
      return fileUrl
    } catch (e) {
      throw e
    }
  }
}