require('dotenv').config()
const device = require('../src/models/device')

async function main () {
  try {
    const devices = await device.list()
    // delete each device
    let count = 0
    for (const d of devices) {
      count++
      try {
        await device.delete(d.url)
        console.log(`successfully deleted device ${count} - ${d.url}`)
      } catch (e) {
        console.log(`failed to delete device ${count}:`, e.message)
      }
    }
  } catch (e) {
    console.log('error', e)
  }
}

main()