/* global fetch, console */
async function fetchOpenRouter() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  const data = await res.json();
  const embeddings = data.data.filter(m => m.id.includes("embed") || m.id.includes("qwen"));
  console.log(embeddings.map(m => m.id + " | " + m.pricing.prompt));
}
fetchOpenRouter();
