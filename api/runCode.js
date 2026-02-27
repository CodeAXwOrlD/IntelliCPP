export default function handler(req, res) {
  // Redirect to the main API handler with the endpoint parameter
  req.query.endpoint = 'runCode';
  const mainHandler = require('./internal/api-handler').default;
  return mainHandler(req, res);
}
