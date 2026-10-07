const LIMIT = 280;

const palettes = [
  { color: 'amber', hex: '#e9a34d', base: 'bourbon', glass: 'old fashioned', garnish: 'an orange peel', taste: 'warm, smoky, bittersweet' },
  { color: 'violet', hex: '#a88dff', base: 'gin', glass: 'coupe', garnish: 'a violet sugar rim', taste: 'floral, bright, a little strange' },
  { color: 'rose', hex: '#f28c9c', base: 'vodka', glass: 'martini', garnish: 'a single cherry', taste: 'tart, soft, and sweet' },
  { color: 'midnight blue', hex: '#5167b5', base: 'mezcal', glass: 'rocks', garnish: 'a smoked lime wheel', taste: 'dark, citrusy, and dry' },
  { color: 'copper', hex: '#c97643', base: 'rum', glass: 'highball', garnish: 'a folded lime leaf', taste: 'spiced, fizzy, and warm' },
];

const moodWords = [
  ['love', 'tender, vulnerable'], ['miss', 'nostalgic, still waiting'], ['wait', 'restless, suspended'],
  ['text', 'hopeful, unread'], ['alone', 'quiet, looking outward'], ['sad', 'low-lit, tender'],
  ['happy', 'bright, celebratory'], ['scared', 'brave, a little shaken'], ['work', 'over-caffeinated, determined'],
  ['friend', 'open-hearted, social'], ['home', 'homesick, warm'], ['dream', 'hazy, hopeful'],
];

const names = ['After Hours', 'Last Call', 'Soft Landing', 'Unread Message', 'Blue Hour', 'Second Thought', 'Small Miracle', 'Night Bus', 'The Long Way Home'];

export function validateThought(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Tell the bartender what is on your mind first.');
  if (value.trim().length > LIMIT) throw new Error(`Keep it under ${LIMIT} characters so it fits on a coaster.`);
  return value.trim();
}

function hash(text) { return [...text.toLowerCase()].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7); }

// The course proxy presently provides image generation, not a configured text model.
// This transparent, deterministic translation gives the image model a structured prompt.
export function interpretThought(rawThought) {
  const thought = validateThought(rawThought);
  const lower = thought.toLowerCase();
  const seed = hash(thought);
  const palette = palettes[seed % palettes.length];
  const match = moodWords.find(([word]) => lower.includes(word));
  const mood = match ? match[1] : ['contemplative, quietly open', 'restless, searching for a sign', 'softly hopeful, a little guarded'][seed % 3];
  const name = names[seed % names.length];
  return { name, ...palette, mood };
}

export function readCocktailDescription(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The bartender returned an unreadable drink description.');
  const cocktail = {};
  for (const key of ['name', 'base', 'taste', 'color', 'glass', 'garnish', 'mood']) {
    const value = typeof raw[key] === 'string' ? raw[key].trim().replace(/\s+/g, ' ') : '';
    if (!value || value.length > 120) throw new Error('The bartender returned an incomplete drink description.');
    cocktail[key] = value;
  }
  const hex = typeof raw.hex === 'string' ? raw.hex.trim() : '';
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error('The bartender returned an invalid drink color.');
  return { ...cocktail, hex: hex.toLowerCase() };
}

export function cocktailImagePrompt(cocktail, thought) {
  return `Editorial cocktail photography of one original cocktail named ${cocktail.name}, inspired by this private thought: "${thought}". ${cocktail.color} drink with ${cocktail.base}, served in a ${cocktail.glass} glass, ${cocktail.garnish}; mood: ${cocktail.mood}; tasting notes: ${cocktail.taste}. Intimate downtown cocktail bar at night, cinematic amber light, dark walnut bar, soft film grain, elegant, one drink centered, no people, no labels, no letters, no text.`;
}

export const MAX_THOUGHT_LENGTH = LIMIT;
