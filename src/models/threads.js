const db = require('./db')
// cache of cache
let cache = []
// get data every 30 seconds
const throttle = 30 * 1000

async function updateCache() {
  try {
    // get cache from database
    const data = await db.find('helper', 'cache', query, projection, sort)
    // update cache cache
    cache = data
  } catch (e) {
    // uh oh
    console.log('failed to update threads cache from database:', e)
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
  updateCache()
}, throttle)

module.exports = {
  get: () => cache,
  push: (value) => {
    // add to database
    db.insertOne('helper', 'thread', value)
    // add to cache
    cache.push(value)
  }
}
