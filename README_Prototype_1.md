# Touch Coding — Prototype 1 (Final)

**Type**: Tap-to-Code micro IDE  
**File**: `Prototype_1_FINAL.html` (single-file, runs locally in your browser)

## What’s inside
- `Prototype_1_FINAL.html` — the full runnable prototype (HTML + CSS + JS)
- `code.js` — extracted JavaScript from the HTML for code review
- `README.md` — this file

## How to run
1. Double‑click `Prototype_1_FINAL.html` (no install, no server needed).
2. Use the palette to add `LET`, `PRINT`, `IF`, `FOR`.
3. Select a line, choose **Into: THEN/ELSE** and **Insert:** type, then press **Add Inside Selected**.
4. Tap colored tokens to edit values (on‑screen keypad/operators appear).
5. Press **Run** to execute. Console shows output.
6. **Undo/Redo** for safety. **Show Code** to copy transpiled JS.
7. **Save/Load** uses JSON export/import. Autosave persists in your browser’s localStorage.

## Notes
- IF operators are validated; invalid ones fall back to `==` to avoid runtime breaks.
- The status pill shows which branch (THEN/ELSE) you’re inserting into.
- Sample program is preloaded on first open; afterwards autosave restores your last state.

## Packaging
If you need to submit only one file, `Prototype_1_FINAL.html` is self‑contained.
`code.js` is provided for convenience if reviewers prefer separate JS.

— Built for Summer Research: Touch‑based IDE (Prototype 1, Final)