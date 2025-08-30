# Touch Coding — Prototype 2 (Final)

**Type**: Touch-first code editor with multi-file HTML/CSS/JS projects  
**File**: `Prototype_2_FINAL.html` (single-file app, runs locally)

## Features
- Multi-file support: create `.js`, `.html`, `.css` files
- HTML build pipeline: if an HTML file exists (prefers `index.html`), Run builds a full page by inlining all CSS/JS
- Quick add: **+ JS**, **+ HTML**, **+ CSS**
- Preview tools: **Open Preview** (new tab) and **Download HTML** (single runnable build)
- Console filters: All / Logs / Warnings / Errors; **Copy Log**
- Snippets library: loops, if/else, functions, try/catch, class, reduce, async/await, DOM, canvas, setInterval, fetch mock
- Autosave persists project

## How to run
1. Open `Prototype_2_FINAL.html` in your browser.
2. Use the filebar to add or rename files. If you add `index.html` and `styles.css`, they will be included automatically.
3. Write code and press **Run ▶**. Use **Open Preview** to pop the page into a new tab.
4. Use **Download HTML** to export a single-file build of your project.

## Notes
- When no `.html` file is present, Run executes the bundled JS in a sandbox with console capture.
- Console filter toggles apply live; **Copy Log** copies only the visible logs.

— Built for Summer Research: Touch‑based IDE (Prototype 2, Final)