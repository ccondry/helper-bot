require('dotenv').config()
const webex = require('../../src/models/webex')
const fs = require('fs')

async function main () {
  const token = process.env.TOKEN
  const file = fs.createReadStream('./yoshi.jpg')
  const data = {
    toPersonEmail: 'ccondry@cisco.com',
    text: 'test file send',
    files: [file]
  }
  const response = await webex(token).messages.create(data)
  console.log(response)
}

main().catch(e => console.log(e))