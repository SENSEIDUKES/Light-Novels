// Build placeholder. vercel.json replaces this file with the fully bundled
// server-bundle/entry.ts before Vercel packages the function.
export default function unbuiltServerlessHandler(_request, response) {
  response.statusCode = 503;
  response.end('The Vercel serverless bundle was not built.');
}
