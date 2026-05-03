import fetch from 'node-fetch';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const apiKey = env.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/)?.[1]?.trim();

async function listModels() {
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  console.log("Querying Gemini models for key starting with:", apiKey.substring(0, 8));

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      console.error("API Error:", JSON.stringify(data.error, null, 2));
      return;
    }

    console.log("\n--- AVAILABLE MODELS ---");
    data.models.forEach(m => {
      console.log(`- ${m.name}`);
    });
    
    fs.writeFileSync('scripts/models_data.json', JSON.stringify(data.models, null, 2));
    console.log("Saved to scripts/models_data.json");

  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

listModels();
