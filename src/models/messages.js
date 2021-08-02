const db = require('./db')
// cache of cache
let cache = []
// get data every 30 seconds
const throttle = 30 * 1000
const collection = 'threads'

async function updateCache() {
  try {
    // get threads from database
    const data = await db.find('helper', collection, query, projection, sort)
    // update threads cache
    threads = data
  } catch (e) {
    // uh oh
    console.log(`failed to get ${collection} cache from database:`, e)
  }
}

// get data now
updateCache()

// every 30 seconds replace the cache cache with the database data
setInterval(function () {
  // get all cache
  const query = {}
  // don't include _id in returned data
  const projection = {_id: -1}
  // sort by most recent first to improve find speed
  const sort = {_id: -1}
  db.find('helper', 'message', query, projection, sort)
  .then(data => {
    // update cache
    cache = data
  })
}, throttle)

module.exports = {
  get: () => cache,
  push: async (value) => {
    // add to cache
    cache.push(value)
    try {
      // add to database
      await db.insertOne('helper', collection, value)
    } catch (e) {
      // uh oh
      console.log(`failed to update ${collection} cache in database:`, e)
    }
  }
}
