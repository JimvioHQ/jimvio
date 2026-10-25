import fs from "node:fs";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const out = {};
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return out;
}

const fileEnv = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
const apiKey = (process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY || "").trim();
const model = (process.env.OPENAI_MODEL || fileEnv.OPENAI_MODEL || "gpt-4o-mini").trim();
const usable = apiKey.length >= 12 && !/your-|changeme|^xxx$/i.test(apiKey);

console.log(`OPENAI_API_KEY: ${usable ? "set" : apiKey ? "placeholder" : "missing"}`);
console.log(`OPENAI_MODEL: ${model}`);
console.log("GOOGLE_GENERATIVE_AI_API_KEY is the outage fallback only. Active routes call OpenAI first.");

if (!process.argv.includes("--live")) {
  console.log("Pass --live to send one short Responses API request. The key is not printed.");
  process.exit(usable ? 0 : 1);
}

if (!usable) {
  console.error("Refusing live check: OPENAI_API_KEY is missing.");
  process.exit(1);
}

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    input: "Reply with the single word ready.",
    max_output_tokens: 16,
    store: false,
  }),
});

console.log(`OpenAI status: ${response.status}`);
if (!response.ok) {
  const body = await response.text();
  console.error(body.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 300));
  process.exit(1);
}
console.log("OpenAI responded.");

const embedding = await fetch("https://api.openai.com/v1/embeddings", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "text-embedding-3-small",
    input: "jimvio",
    dimensions: 768,
  }),
});

console.log(`Embedding status: ${embedding.status}`);
if (!embedding.ok) {
  const body = await embedding.text();
  console.error(body.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 300));
  process.exit(1);
}
const payload = await embedding.json();
const width = Array.isArray(payload?.data?.[0]?.embedding) ? payload.data[0].embedding.length : 0;
console.log(`Embedding dimensions: ${width}`);
if (width !== 768) {
  console.error("Embedding width is not 768.");
  process.exit(1);
}
