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
  async get (url) {
    let response
    try {
      console.log('using token', process.env.ACCESS_TOKEN)
      // get file
      const options = {
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
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
      const filename = getFilename(response)
      // console.log('filename:', filename)
      const id = uuidv4()
      const folder = `${process.env.FILE_PATH}/${id}`
      // create the folder
      await fsp.mkdir(folder)
      // build full file path
      const path = `${folder}/${filename}`
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
      console.log('failed to upload/write file:', e.message)
      throw Error('Failed to upload file attachment')
    }
  }
}