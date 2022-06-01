const fetch = require('node-fetch')
// const { getMimeType } = require('stream-mime-type')

const url = 'https://webexapis.com/v1/messages'

// send file as attachment with webex message
async function upload ({
  filename,
  fileMetaName = 'files',
  contentType,
  content,
  metadata = {},
  token
}) {
  try {
    // build the payload body
    const boundary = 'xxxxxxxxxx'
    let data = ''
    // append each metadata field to the body
    for(const i in metadata) {
      if ({}.hasOwnProperty.call(metadata, i)) {
        data += `--${boundary}\r\n`
        data += `Content-Disposition: form-data; name="${i}"; \r\n\r\n${metadata[i]}\r\n`
      }
    }
    data += `--${boundary}\r\n`
    // append the file content disposition
    data += `Content-Disposition: form-data; name="${fileMetaName}"; filename="${filename}"\r\n`
    // append file content type
    data += `Content-Type: ${contentType}\r\n\r\n`

    // append file content
    const body = Buffer.concat([
      Buffer.from(data, 'utf8'),
      // Buffer.from(content, 'utf8'),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ])

    console.log('REST body:', body)

    // build REST data
    const options = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body
    }

    // send request to Webex
    const response = await fetch(url, options)
    // parse response body
    const json = await response.json()
    // check response status code
    if (response.ok) {
      // success
      return json
    } else {
      // failed
      // build error message
      let message = `${response.status} ${response.statusText} - ${JSON.stringify(json, null, 2)}`
      // build error object
      const error = Error(message)
      error.status = response.status
      error.statusText = response.statusText
      error.text = JSON.stringify(json, null, 2)
      // throw the error
      throw error
    }
  } catch (e) {
    // rethrow any errors
    throw e
  }
}

// function streamToBuffer(stream) {
//   return new Promise((resolve, reject) => {
//     const chunks = []
//     stream.on('error', reject)
//     stream.on('data', (chunk) => chunks.push(chunk))
//     stream.on('end', () => resolve(Buffer.concat(chunks)))
//   })
// }

module.exports = async function ({token, data}) {
  // console.log('webex file upload got input data:', data)
  // only handle 1 file since webex only handles 1 file per message
  const file = data.files[0]
  // extract metadata
  const metadata = {}
  for (const key of Object.keys(data)) {
    // skip files
    if (key === 'files') continue
    // keep everything else
    metadata[key] = data[key]
  }
  
  return upload({
    filename: file.filename,
    contentType: file.contentType,
    content: file.content,
    metadata,
    token
  })
  // let stream
  // // is file a string?
  // console.log('file input type is', typeof file)
  // if (typeof file === 'string') {
  //   // hope it's a URL!
  //   stream = file
  // } else {
  //   // it's a stream
  //   stream = file
  // }
  // // get content type / mime type
  // // const r = await getMimeType(stream)
  // // const contentType = r.mime
  // const contentType = 'image/jpeg'
  // console.log('contentType', contentType)
  // // get rewound stream
  // // stream = r.stream
  // // build filename
  // // const extension = contentType.split('/').pop()
  // // console.log('extension', extension)
  // // const d = new Date()
  // const filename = stream.path
  // //  || `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${extension}`
  // // console.log('filename', filename)
  // // read stream to memory
  // // const content = await streamToBuffer(stream)
  // const content = stream.buffer()
  // console.log('content buffer', content)
  // // console.log('metadata', metadata)
  // // send REST request to Webex
  // return upload({
  //   filename,
  //   contentType,
  //   content,
  //   metadata,
  //   token
  // })
}