export default function handler(req, res) {
  // Redirect to the main API handler with the endpoint parameter
  req.query.endpoint = 'getStats';
  const mainHandler = require('./internal/api-handler').default;
  return mainHandler(req, res);
}
