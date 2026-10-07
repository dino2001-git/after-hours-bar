// Teacher-provided course proxy — no Replicate key belongs in browser code.
import { cocktailImagePrompt, readCocktailDescription } from './cocktail.js';

const PROXY_URL = 'https://itp-ima-replicate-proxy.web.app/api/create_n_get';
const NANO_BANANA_MODEL = 'google/nano-banana';
const BARTENDER_MODEL = 'meta/meta-llama-3-8b-instruct';
function mediaUrlFromPrediction(prediction) {
  if (!prediction || typeof prediction !== 'object' || prediction.error || ['failed', 'canceled', 'starting', 'processing'].includes(prediction.status)) throw new Error('The image model could not finish this drink. Please try again later.');
  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  let url; try { url = new URL(output); } catch { throw new Error('The image model returned no usable image.'); }
  if (url.protocol !== 'https:') throw new Error('The image model returned an unsupported image address.');
  return url.href;
}

function textFromPrediction(prediction) {
  if (!prediction || typeof prediction !== 'object' || prediction.error || ['failed', 'canceled', 'starting', 'processing'].includes(prediction.status)) throw new Error('The bartender could not finish the recipe. Please try again.');
  const output = Array.isArray(prediction.output) ? prediction.output.join('') : prediction.output;
  if (typeof output !== 'string') throw new Error('The bartender returned no recipe. Please try again.');
  const match = output.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('The bartender returned a recipe in the wrong format. Please try again.');
  const cleaned = match[0]
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
  try { return readCocktailDescription(JSON.parse(cleaned)); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const loose = {};
    for (const key of ['name', 'base', 'taste', 'color', 'glass', 'garnish', 'mood', 'hex']) {
      const field = new RegExp(`(?:["']?${key}["']?)\\s*:\\s*["']([^"']+)["']`, 'i').exec(cleaned);
      if (field) loose[key] = field[1];
    }
    try { return readCocktailDescription(loose); }
    catch { throw new Error('The bartender returned a recipe in the wrong format. Please try again.'); }
  }
}

export async function generateCocktailDescription(thought, { signal } = {}) {
  const body = JSON.stringify({
    model: BARTENDER_MODEL,
    input: {
      system_prompt: 'You are an imaginative cocktail bartender. Turn a private thought into one original cocktail. Return ONLY one compact JSON object, with double-quoted string values and exactly these keys: name, base, taste, color, glass, garnish, mood, hex. Do not use line breaks, markdown, commentary, or extra keys. Make every value concrete and short. hex must be a six-digit CSS hex color such as #b46847.',
      prompt: `Private thought: ${JSON.stringify(thought)}`,
      max_tokens: 180,
      temperature: 0.2,
    },
  });
  let response;
  try { response = await fetch(PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal }); }
  catch (error) { if (signal?.aborted) throw error; throw new Error('The AI bartender is unreachable. Check your connection and try again.'); }
  if ([401, 403, 429].includes(response.status)) throw new Error('The course AI proxy needs NYU sign-in or has reached its limit. Try again later.');
  if (!response.ok) throw new Error(`The AI bartender is unavailable (${response.status}).`);
  let prediction;
  try { prediction = await response.json(); } catch { throw new Error('The AI bartender returned an unreadable response.'); }
  return textFromPrediction(prediction);
}

export async function generateCocktailImage(cocktail, thought, { signal } = {}) {
  const body = JSON.stringify({
    model: NANO_BANANA_MODEL,
    input: { prompt: cocktailImagePrompt(cocktail, thought), aspect_ratio: '1:1', output_format: 'jpg' },
  });
  let response;
  try { response = await fetch(PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal }); }
  catch (error) { if (signal?.aborted) throw error; throw new Error('The image bartender is unreachable. Check your connection and try again.'); }
  if ([401, 403, 429].includes(response.status)) throw new Error('The course image proxy needs NYU sign-in or has reached its limit. Try again later.');
  if (!response.ok) throw new Error(`The course image service is unavailable (${response.status}).`);
  let prediction;
  try { prediction = await response.json(); } catch { throw new Error('The image service returned an unreadable response.'); }
  return mediaUrlFromPrediction(prediction);
}
