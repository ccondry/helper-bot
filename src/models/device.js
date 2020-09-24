const fetch = require('node-fetch')

module.exports = {
  async delete (url) {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
        }
      })
      if (response.ok) {
        const json = await response.json()
        return json
      } else {
        const text = await response.text()
        throw Error(`${response.status} ${response.statusText} - ${text}`)
      }
    } catch (e) {
      throw e
    }
  },
  async list () {
    try {
      const url = 'https://wdm.a6.ciscospark.com/wdm/api/v1/devices'
      const options = {
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
        }
      }
      const response = await fetch(url, options)
      const json = await response.json()
      if (response.ok) {
        return json.devices
      } else {
        throw Error(`${response.status} ${response.statusText} - ${json.message}`)
      }
    } catch (e) {
      throw e
    }
  }
}