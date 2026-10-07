import { firebaseConfig } from './firebase-config.js';

const PATH = 'fakeBar/drinks';

function cleanString(value, maximum) { return typeof value === 'string' ? value.trim().slice(0, maximum) : ''; }
function cleanCocktail(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cocktail = {};
  for (const key of ['name', 'base', 'taste', 'color', 'glass', 'garnish', 'mood', 'hex']) cocktail[key] = cleanString(raw[key], 120);
  return cocktail.name && cocktail.base && cocktail.color ? cocktail : null;
}
export function readDrinks(snapshot) {
  const drinks = [];
  snapshot.forEach((child) => {
    const row = child.val() || {};
    const cocktail = cleanCocktail(row.cocktail);
    if (!cocktail || !/^https:\/\//.test(row.imageUrl || '')) return;
    drinks.push({ id: child.key, uid: cleanString(row.uid, 128), owner: cleanString(row.owner, 48), thought: cleanString(row.thought, 280), imageUrl: row.imageUrl, cocktail, timestamp: Number(row.timestamp) || 0 });
  });
  return drinks.sort((a, b) => b.timestamp - a.timestamp).slice(0, 80);
}

export async function connectBar({ onDrinks, onConnection }) {
  if (!firebaseConfig?.apiKey || !firebaseConfig?.databaseURL || !firebaseConfig?.projectId) throw new Error('Firebase needs its web configuration before the bar can be shared.');
  const [{ initializeApp }, authSDK, dbSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js'),
  ]);
  const app = initializeApp(firebaseConfig, 'fake-bar');
  const auth = authSDK.getAuth(app);
  await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);
  await auth.authStateReady();
  const user = auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
  const db = dbSDK.getDatabase(app);
  const { ref, onValue, push, set, serverTimestamp, query, orderByChild, limitToLast } = dbSDK;
  const stops = [
    onValue(ref(db, '.info/connected'), (s) => onConnection(s.val() === true)),
    onValue(query(ref(db, PATH), orderByChild('timestamp'), limitToLast(80)), (s) => onDrinks(readDrinks(s))),
  ];
  return {
    uid: user.uid,
    async publish({ owner, thought, cocktail, imageUrl }) {
      const key = push(ref(db, PATH)).key;
      await set(ref(db, `${PATH}/${key}`), { owner: cleanString(owner, 48), thought: cleanString(thought, 280), cocktail, imageUrl, timestamp: serverTimestamp(), uid: user.uid, reactions: 0 });
      return key;
    },
    close() { stops.forEach((stop) => stop()); },
  };
}
