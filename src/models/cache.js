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

  find (query) {
    // don't include _id in returned data
    const projection = {_id: -1}
    // sort by most recent first to improve find speed?
    const sort = {_id: -1}
    // find data
    return db.find('helper', this.collection, query, projection, sort)
  }
}

module.exports = Cache