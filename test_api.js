const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-card-image',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};
const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { console.log(res.statusCode); console.log(data.substring(0, 500)); });
});
req.write(JSON.stringify({
  prompt: "a beautiful cat",
  type: "cover",
  routingConfig: { provider: "gemini", model: "gemini-3.1-flash-image" }
}));
req.end();
