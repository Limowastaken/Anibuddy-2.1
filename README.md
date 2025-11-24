```markdown
# Anibuddy — Extended

Anibuddy is a PWA that searches anime using the Jikan API. This extended setup adds:

- Capacitor wrapper for Android (creates native builds)
- Autocomplete suggestions, infinite scroll, filters, and optional auto-refresh (polling)
- Export/import favorites
- Unit tests (Jest) for utility functions
- GitHub Actions CI with Netlify deploy (requires Netlify secrets)

Quick local run
1. Install dependencies:
   npm ci

2. Start a local static server:
   npm start
   Open http://localhost:8080

Search features
- Autocomplete suggestions appear as you type.
- Infinite scroll loads more pages automatically.
- Use the Type and Status filters to refine searches.
- Enable "Auto-refresh" to poll the current search every N seconds.

Favorites
- Tap the star (☆) on any card to save/remove favorites.
- Export favorites as JSON or import a JSON file.

Capacitor (Android) build
1. Initialize Capacitor (only if not initialized):
   npm run cap:init

2. Copy web assets into the native project:
   npm run cap:copy

3. Add Android platform (one-time):
   npm run cap:add-android

4. Open Android Studio and build:
   npx cap open android
   (Then build/run from Android Studio)

Notes:
- Capacitor expects your production files to be in "www". If you serve from root, either copy files into a "www" folder or adjust capacitor.config.json webDir.

Unit tests
- Simple unit tests are included for utilities.
- Run:
  npm test

CI & deploy (Netlify)
- Workflow in .github/workflows/ci.yml runs tests and deploys to Netlify on pushes to main.
- Set repository secrets:
  - NETLIFY_AUTH_TOKEN
  - NETLIFY_SITE_ID

Tips & rate limits
- Jikan public API has rate limits. Try to keep search frequency reasonable.
- The app caches the last search results in localStorage to show offline fallback.

Files added/updated
- index.html (search, suggestions, filters)
- styles.css (UI updates)
- src/utils.js (testable small utilities)
- app.js (main logic with autocomplete, infinite scroll, polling)
- package.json (scripts + dev deps)
- capacitor.config.json (Capacitor config)
- .github/workflows/ci.yml (test + Netlify deploy)
- netlify.toml (Netlify settings)
- README.md (this file)

If you want, I can:
- Generate a zip with platform-ready files for Capacitor (prepared www folder).
- Add automated E2E tests (Playwright) to the CI.
- Provide an Android APK build via GitHub Actions (requires signing secrets).
Which of the above would you like next?
```
