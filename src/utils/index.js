// helper function to append query parameters to a URL for node-fetch
export const addUrlQueryParams = function (endpoint, params) {
  let url = new URL(endpoint)
  if (params) {
    // append URL query paramenters
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
  }
  return url
}