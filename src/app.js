// Load our environment variables
require('dotenv').config()
// express.js REST server
const express = require('express')
// JSON request body parser
const bodyParser = require('body-parser')
// CORS package
// const cors = require('cors')
// meta info about this project
const pkg = require('../package.json')

// init express
const app = express()

// parse all request body as JSON, limited to 16 megabytes
app.use(bodyParser.json({limit: '16mb'}))

// enable CORS
// app.use(cors())

// echo this package version
app.use('/api/v1/version', require('./routes/version'))

// save oauth client access code
// app.use('/api/v1/oauth2', require('./routes/oauth2'))

// webhook messages from Webex
app.use('/api/v1/webhook', require('./routes/webhook'))

// listen on port defined in .env
const server = app.listen(process.env.NODE_PORT || 3400, () => {
  console.log(pkg.name, 'started listening on port', server.address().port, 'in', app.settings.env, 'mode')
})

// start web socket server on same port
// const websocket = require('./models/websocket')
// websocket.start(server)
