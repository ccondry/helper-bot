const fetch = require('node-fetch')

module.exports = async function (url, options) {
  try {
    const response = await fetch(url, options)
    if (response.ok) {
      try {
        const json = await response.json()
        return json
      } catch (e) {
        return
      }
    } else {
      let message = ''
      try {
        const text = await response.text()
        message = ' - ' + text
        const json = JSON.parse(text)
        message = ' - ' + json.message
      } catch (e) {
        // continue
      }
      throw Error(`${response.status} ${response.statusText}${message}`)
    }
  } catch (e) {
    throw e
  }
}