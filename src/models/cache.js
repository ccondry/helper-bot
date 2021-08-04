const db = require('./db')

class Cache {
  constructor (collection) {
    this.collection = collection
  }

  insertOne (value) {
    return db.insertOne('helper', this.collection, value)
  }

  find (query) {
    // don't include _id in returned data
    const projection = {_id: 0}
    // find data
    return db.find('helper', this.collection, query, projection)
  }

  findOne (query) {
    // don't include _id in returned data
    const projection = {_id: 0}
    // find data
    return db.findOne('helper', this.collection, query, {projection})
  }
}

module.exports = Cache