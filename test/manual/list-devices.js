// const mentionRegex = /<spark-mention.*<\/spark-mention>/g
// const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
// const html = '<p><spark-mention data-object-type="person" data-object-id="Y2lzY29zcGFyazovL3VzL1BFT1BMRS83NzVlYTkzMS0xN2Q0LTRjZjYtOGEzMi0wZjNhMGJlNjRhNWQ">Helper</spark-mention> ccondry@cisco.com ok I got u</p>'

// const a = html.replace(reg, '').replace(reg2, '<@personEmail:$&>')

// console.log(a)
// // console.log(html)

require('dotenv').config()
const device = require('../src/models/device')

async function main () {
  try {
    const devices = await device.list()
    console.log(`you have ${devices.length} devices`)
  } catch (e) {
    console.log('error', e.message)
  }
}

main()