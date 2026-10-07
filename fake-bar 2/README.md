# After Hours

**A shared bar for thoughts after dark.** Write a thought; an AI bartender turns it into a cocktail, then places it on a live public counter for other people to discover.

## What it does

- Uses a name entered by each visitor as a lightweight social identity.
- Turns a private thought into a structured cocktail recipe with an AI bartender.
- Generates a colorful cocktail image using Nano Banana.
- Saves the name, thought, recipe, image URL, and timestamp in Firebase Realtime Database.
- Shows every submitted drink in a live, shared counter. Clicking a drink reveals the story behind it.

The AI is not a conversation endpoint: it translates a private thought into a social object that other people can discover.

## Run locally

Serve the folder over HTTP:

```sh
python3 -m http.server 8001 --directory fake-bar
```

Then open `http://localhost:8001`.

## Firebase setup

1. Create a Firebase Web app and a Realtime Database.
2. Enable **Anonymous** Authentication.
3. Copy `firebase-config.example.js` to `firebase-config.js`, then add the public Web app configuration.
4. Publish the rules from `firebase.rules.json` in Firebase Realtime Database.

`firebase-config.js` is intentionally ignored by Git. Firebase rules, not the public browser configuration, protect writes.

## AI flow

The course Replicate proxy first uses `meta/meta-llama-3-8b-instruct` to produce the cocktail recipe. The thought and recipe then go to `google/nano-banana` to generate the drink image. No API key is stored in this project.

The course proxy may require NYU authentication and has usage limits. Generated image URLs can expire.
