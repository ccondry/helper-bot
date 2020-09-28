const mongo = require('@ccondry/mongo-wrapper')

// library options. url is required
const url = process.env.MONGO_URL

// optional - these are the default values
const connectOptions = {
  useNewUrlParser: true,
  poolSize: 5, 
  useUnifiedTopology: true
}
// optional - this is the default value
const logLevel = 1

// our mongo connection object
const db = new mongo(url, connectOptions, logLevel)

// start connecting now
// db.getConnection('helper')

module.exports = db