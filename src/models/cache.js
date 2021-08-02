const db = require('./db')

class Cache {
  constructor ({
    // the cache array to use. optional - default empty array.
    cache = [],
    // the collection in db to use
    collection,
    // how often to update the local cache. optional - default 30 seconds.
    throttle = 30 * 1000
  }) {
    // the local cache array
    this.cache = cache
    this.throttle = throttle
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