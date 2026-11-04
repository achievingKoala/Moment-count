# Windvale

## Play locally
Run `npm install`, then `npm run dev`. Open `http://localhost:8080/play.html?scene=village`.
Use `scene=cafe` or `scene=market` for the other scenes. `play.html` is the only game page; old scene-specific HTML entries have been removed.

## File layout
- `src/main.js`: scene setup, characters, movement, dialogue and game wiring.
- `src/scenes/market.js`: market scenery.
- `src/practice-content.js`: question banks and English answer hints.
- `src/character-voice.js`: character voice selection.
- `src/speaking-feedback.js`: feedback cards and requests.
- `src/practice-history.js`: browser-local submission history.
- `src/greeting-quest.js`: greeting quest progress.
- `src/page.html`, `src/style.css`: page structure and appearance.
- `assets/`: the five character models used at runtime.
- `functions/api/speaking-feedback.js`: server-side AI endpoint.
- `Ultimate Modular Women Pack-glb/`: original source models; not required at runtime.

## Updating and publishing
Edit files under `src/`, run `npm run build`, then commit source and generated files together.
The generated `play.html`, `app.js` and `style.css` are tracked so hosting can publish existing files. `app.js.map` is a local debug artifact and is ignored.
Models remain separate files, allowing the browser to reuse its cache. Refreshing or switching scenes still reconstructs the 3D scene.

## AI feedback
Configure `OPENROUTER_API_KEY` in local `.env.local`; optionally set `OPENROUTER_SPEAKING_MODEL`. Restart the local server after changing backend code or configuration. Never publish `.env.local`; cloud hosting must supply the key as a server-side secret.
Cloudflare Pages Functions serves `/api/speaking-feedback`. Static HTML hosting alone does not run this endpoint.
Feedback shows a text-expression estimate, up to two key corrections and two improvements. Capitalization, spacing and punctuation are ignored. Actual pronunciation and spoken fluency are not assessed.
Submission history and quest progress live in the current browser, with no account or cross-device sync.

## Validation
Run `npm test` for mocked AI, feedback navigation, persistence and voice-selection checks. These do not verify real audio, paid AI calls or deployment.
