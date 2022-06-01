const retry = require('./retry')

module.exports = function (token) {
  return {
    messages: {
      get: data => retry('messages', 'get', {data, token}),
      create: data => retry('messages', 'create', {data, token}),
      remove: data => retry('messages', 'remove', {data, token})
    },
    people: {
      get: data => retry('people', 'remove', {data, token})
    }
  }
}