# Copilot / Agent Instructions for Budget Planner (Multi-Aula)

Purpose: give AI coding agents the essential, actionable knowledge to be productive in this repository.

- **Entry points:** `src/App.jsx` is the single, central React component (all UI + logic). `src/index.js` mounts it. `public/index.html` is static template.
- **Build / run:** uses Create React App scripts in `package.json`:
  - Install: `npm install`
  - Dev server: `npm start` (localhost:3000)
  - Build: `npm run build`

- **Major architecture:**
  - Single-page React app contained in `src/App.jsx`. There is no router or backend integration by default.
  - State: local component state via React hooks (`useState`, `useEffect`). Data persistence is client-side `localStorage`.
  - UI: inline styles in JSX (not CSS-in-JS library); global small rules in `src/index.css`.

- **Key data flows & naming conventions:**
  - Local storage key: `preventivi_multiaula` — used to save/load full project objects.
  - Project shape saved: `{ nome, data, progetto, aule, gestioneCosti, realizzazioneCosti, docenzeCosti, commerciale, note }`.
  - IDs are generated with `Date.now()` for list items; aula ids start at small integers.
  - Variable and UI copy: Italian (e.g., `progetto`, `aule`, `gestioneCosti`) — keep language consistent when modifying UI or messages.

- **Important functions / patterns to reference:**
  - `salvaPreventivo()` — handles save with `localStorage` and is debounced by an effect (2s auto-save). See `useEffect` that triggers `salvaPreventivo`.
  - `caricaPreventivo(nome)` / `eliminaPreventivo(nome)` — load / delete from saved list.
  - `calcolaRicavoAula(aula)` and `calcolaCostiAula(aulaId)` — core business logic calculating revenues, cost splits and partner fees.
  - Cost items use `ripartizioneEqua` boolean plus `auleAssegnate` array to decide per-aula allocation.

- **Project-specific conventions / decisions to preserve:**
  - Keep UI text in Italian to match existing UX.
  - Preserve inline styling approach (component-level styles) unless migrating consistently across the repo.
  - Use the existing `coloriDisponibili` array (in `App.jsx`) for default aula colors.

- **Debugging and developer tips:**
  - To reset saved projects: clear the `preventivi_multiaula` key in browser DevTools (`localStorage.removeItem('preventivi_multiaula')`).
  - Dev server: `npm start` opens at `http://localhost:3000` with CRA hot reload.
  - There are no unit tests currently. Add tests under a `src/__tests__` folder and integrate with `npm test` (CRA's Jest config).

- **Integration points / external deps:**
  - Dependencies are only `react`, `react-dom`, and `react-scripts` (see `package.json`). No external APIs by default.
  - If adding a backend, replace `salvaPreventivo`/`caricaPreventivo` to POST/GET the same object shape; keep localStorage fallback for offline convenience.

- **When making changes, prefer minimal, local edits:**
  - App is a single large component; prefer extracting small, well-named helper components or pure functions (e.g., move `calcolaCostiAula` to `src/lib/calculations.js`) rather than rewriting the whole file.
  - If introducing a global state manager (Redux/Context), do so only if multiple components will be added.

- **Files to inspect for examples:** `src/App.jsx` (business logic + UI), `src/index.css` (global styles), `package.json` (scripts).

If any section is unclear or you'd like the instructions to be expanded (examples for editing `salvaPreventivo` to call an API, suggested small refactors, or test scaffolding), tell me which part to expand and I'll iterate.
