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
    this.cache = []
    this.throttle = throttle
    this.collection = collection
    // get data now
    this.updateCache()
    // replace cache every throttle ms
    setInterval(() => {
      this.updateCache()
    }, this.throttle)
  }

  async updateCache () {
    try {
        // get all cache
      const query = {}
      // don't include _id in returned data
      const projection = {_id: -1}
      // sort by most recent first to improve find speed
      const sort = {_id: -1}
      // get cache data from database
      const data = await db.find('helper', this.collection, query, projection, sort)
      // update local cache
      this.cache = data
    } catch (e) {
      // uh oh
      console.log(`failed to get ${this.collection} cache from database:`, e)
    }
  }

  async push (value) {
    try {
      // add to cache
      this.cache.push(value)
      // add to database
      await db.insertOne('helper', this.collection, value)
    } catch (e) {
      // uh oh
      console.log(`failed to insert data into ${this.collection} cache collection:`, e)
    }
  }

  get () {
    return this.cache
  }
}

module.exports = Cache