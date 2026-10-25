# fretdrom

JSON5 to SVG renderer for chord diagrams, scale boxes and tablature. Sibling of drumdrom, same habits.

## Layout

- `lib/`: `parse.js` (detects chord, chords, scale or tab), `parse-wave.js`, `render-chord.js`, `render-chords.js`, `render-scale.js`, `render-tab.js`, `render-fretboard.js`, `render-any.js`, `resolve-skin.js`, `sketch.js`, `all-skins.js`; browser pieces `process-all.js`, `render-element.js`, `create-element.js`, `eva.js`; entry points `index.js` (node) and `fretdrom.js` (browser bundle, global `FretDrom`).
- `skins/`: flat objects of colours and metrics (`default`, `dark`, `sketch`, `sketch-dark`). Register new ones in `lib/all-skins.js`.
- `bin/cli.js`: hand-rolled CLI (`--input`, `--output`, `--skin`).
- `editor/`: the web editor, published to the `dist` branch next to the bundles.
- `test/`: mocha and chai. `test/fixtures/*.json5` are rendered through every skin to `docs/images` (`npm run docs`) and to `test/snapshots` (`npm run update-snapshots`) by `scripts/render-fixtures.js`, as `<name>.svg` with underscores and a `_dark`, `_sketch` or `_sketch_dark` suffix.
- `examples/index.html`: gallery; hosted bundle by default, `?local` loads `../dist/fretdrom.js`.
- `todo.md`: the plan, including convergence with drumdrom.

## Commands

- `npm test`, `npm run lint`, `npm run build` (esbuild IIFE into `dist/`, git-ignored), `npm run build-editor` (also copies the editor into `dist/`, used by the deploy workflow).
- After an intended render change: `npm run docs && npm run update-snapshots`, review the diff, commit it.
- `scripts/render-fixtures.js` is the only writer of `docs/images` and `test/snapshots`. It fails on orphan images and on doc references to images no fixture produces.

## Conventions

- CommonJS with `'use strict'`, kebab-case file names, camelCase functions, semver 0.x.
- Output must be deterministic so snapshots work.
- No em dashes in comments, docs or commit messages. Keep comments sparse.
- Tag releases `vX.Y.Z` (Semantic Versioning 2.0.0). Never rewrite history or move pushed tags.
- Never run `npm publish` from automation or an agent. CI does not publish to npm; the author publishes by hand with 2FA (see `CONTRIBUTING.md`).
