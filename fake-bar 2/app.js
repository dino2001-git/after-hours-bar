import { MAX_THOUGHT_LENGTH, validateThought } from './cocktail.js';
import { generateCocktailDescription, generateCocktailImage } from './model.js';
import { connectBar } from './store.js';

const $ = (selector) => document.querySelector(selector);
const state = { bar: null, drinks: [], selected: null };
const form = $('#order-form'); const button = $('#order-button'); const dialog = $('#drink-dialog');

$('#thought').maxLength = MAX_THOUGHT_LENGTH;
$('#name').value = localStorage.getItem('after-hours-name') || '';

function setConnection(message, active = false) { const el = $('#connection'); el.textContent = message; el.style.color = active ? '#f1bd70' : '#c78c96'; }
function escapeText(value) { return value || 'Someone'; }
function showError(error) { $('#form-note').textContent = error.message || 'Something slipped behind the bar. Please try again.'; $('#form-note').style.color = '#f4abb8'; }
function renderDrinks() {
  $('#drink-count').textContent = state.drinks.length;
  const counter = $('#counter'); counter.replaceChildren(); $('#empty-state').hidden = state.drinks.length > 0;
  const template = $('#drink-template');
  state.drinks.forEach((drink) => {
    const card = template.content.cloneNode(true); const button = card.querySelector('.drink-button'); const image = card.querySelector('img');
    image.src = drink.imageUrl; image.alt = `${drink.cocktail.name}, ordered by ${escapeText(drink.owner)}`;
    card.querySelector('.drink-owner').textContent = escapeText(drink.owner);
    card.querySelector('.drink-name').textContent = drink.cocktail.name;
    card.querySelector('.drink-mood').textContent = drink.cocktail.mood;
    button.addEventListener('click', () => openDrink(drink.id)); counter.append(card);
  });
  if (state.selected) { const updated = state.drinks.find((row) => row.id === state.selected.id); if (updated) state.selected = updated; }
}
function openDrink(id) {
  const drink = state.drinks.find((row) => row.id === id); if (!drink) return; state.selected = drink;
  $('#dialog-image').style.backgroundImage = `url("${drink.imageUrl}")`;
  $('#dialog-owner').textContent = `${escapeText(drink.owner)} ORDERED`;
  $('#dialog-name').textContent = drink.cocktail.name; $('#dialog-mood').textContent = drink.cocktail.mood;
  $('#dialog-thought').textContent = `“${drink.thought}”`;
  const details = [['base', drink.cocktail.base], ['taste', drink.cocktail.taste], ['glass', drink.cocktail.glass], ['garnish', drink.cocktail.garnish]];
  const list = $('#drink-details'); list.replaceChildren(); details.forEach(([label, value]) => { const group = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; group.append(dt, dd); list.append(group); });
  dialog.showModal();
}
async function connect() {
  try { state.bar = await connectBar({ onDrinks: (drinks) => { state.drinks = drinks; renderDrinks(); }, onConnection: (online) => setConnection(online ? 'THE BAR IS OPEN' : 'THE BAR IS OFFLINE', online) }); setConnection('THE BAR IS OPEN', true); }
  catch (error) { setConnection('LOCAL PREVIEW ONLY'); showError(new Error('Firebase could not connect. The bar can be viewed, but orders cannot be shared yet.')); console.error(error); }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    if (!state.bar) throw new Error('The shared bar is not connected yet. Please try again once the door is open.');
    const owner = $('#name').value.trim(); if (!owner) throw new Error('Give the bartender a name for your tab.');
    const thought = validateThought($('#thought').value); localStorage.setItem('after-hours-name', owner);
    button.disabled = true; button.firstElementChild.textContent = 'Listening…'; $('#form-note').style.color = ''; $('#form-note').textContent = 'The bartender is reading the room.';
    const cocktail = await generateCocktailDescription(thought);
    button.firstElementChild.textContent = 'Mixing your order…'; $('#form-note').textContent = `${cocktail.name} is being made just for this thought.`;
    const imageUrl = await generateCocktailImage(cocktail, thought);
    await state.bar.publish({ owner, thought, cocktail, imageUrl });
    $('#thought').value = ''; $('#form-note').textContent = 'Your drink is on the counter. Someone else can pick it up.';
  } catch (error) { showError(error); } finally { button.disabled = false; button.firstElementChild.textContent = 'Ask the bartender'; }
});
$('#close-dialog').addEventListener('click', () => dialog.close());
connect();
