const db = require('./db')

class Cache {
  constructor (collection) {
    this.collection = collection
  }

  insertOne (value) {
    return db.insertOne('helper', this.collection, value)
  }

  findOne (query) {
    // don't include _id in returned data
    const projection = {_id: -1}
    // find data
    return db.findOne('helper', this.collection, query, {projection})
  }
}

module.exports = Cache