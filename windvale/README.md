# Windvale

## Play without a server
Double-click `village-walk.html` to open it in a modern browser. The generated HTML embeds code, characters, textures and animation data. No local server or network connection is needed. Keep the file intact; it is larger because it contains all assets.

## Development
Run `npm install` once, then `npm run build` after edits. Sources remain separated under src/ and assets/. The build creates both the development app.js and portable village-walk.html. `npm run dev` is optional for development.

Git tracks source, assets and dependency lockfile. Generated HTML/JS/maps and node_modules are ignored.

## Scene entries
- `village-walk.html`: original village.
- `cafe-walk.html`: cafe Part 1 practice.
- `market-walk.html`: produce market with a Quaternius Adventurer player and Farmer (Oliver), six simulated Part 1 questions. The market uses native character animations and embeds only those two models.
Each portable entry can be opened directly. Use the top-right links to change scenes. Answers stay in the current page only.
For local-server development, run `npm run dev` and open `/play.html?scene=market` (or `cafe` / `village`).
