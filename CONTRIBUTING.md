# Contributing

## Setup

Node 20 or 22.

```bash
git clone https://github.com/morganp/fretdrom.git
cd fretdrom
npm ci
```

## Everyday commands

- `npm test`: mocha tests, including a byte for byte snapshot of every fixture in every skin. CI runs it on Node 20 and 22.
- `npm run lint`: eslint over `lib`, `bin`, `skins`, `scripts` and `test`.
- `npm run build`: esbuild bundles into `dist/` (git-ignored). `npm run build-editor` also copies the web editor into `dist/`.
- `npm run docs`: regenerate `docs/images`.
- `npm run update-snapshots`: regenerate `test/snapshots`.

## Fixtures drive the docs images and the snapshots

Every `test/fixtures/*.json5` is rendered through four skins (`default`, `dark`, `sketch`, `sketch-dark`) by `scripts/render-fixtures.js`. The script is the only writer of `docs/images` and `test/snapshots`; never edit or add an image there by hand.

- Output files are named after the fixture with underscores and a skin suffix: `c-major.json5` gives `c_major.svg`, `c_major_dark.svg`, `c_major_sketch.svg` and `c_major_sketch_dark.svg`.
- `README.md` and `docs/*.md` reference those names. The script fails on a fixture that does not render, on an SVG in the output directory that no fixture produces (an orphan, `git rm` it), and on a doc image reference that is missing or that no fixture produces. To show a new picture in the docs, add a fixture.
- After an intended render change run `npm run docs` and `npm run update-snapshots`, review the SVG diff, and commit it. CI runs both and fails if `git diff` is not empty, so a stale image or snapshot cannot be merged.

## Releasing

1. Update `CHANGELOG.md` (move Unreleased items under the new version) and bump `version` in `package.json`; `npm install --package-lock-only` keeps `package-lock.json` in step.
2. Run `npm run lint`, `npm test`, `npm run docs` and `npm run update-snapshots`, and commit the result. `git status` must be clean afterwards.
3. Tag the commit `vX.Y.Z` (Semantic Versioning 2.0.0) and push `main` and the tag. Never rewrite history or move a pushed tag.
4. The Deploy dist workflow lints, tests and builds, publishes the bundles and the editor to the `dist` branch, asks jsDelivr to refresh `@dist`, and pins the release as `dist-vX.Y.Z` (`https://cdn.jsdelivr.net/gh/morganp/fretdrom@dist-vX.Y.Z/fretdrom.min.js`).
5. `npm publish` is manual and never runs from CI or from an automated agent. Run it from your own terminal, logged in with 2FA (`npm login` first); from a non-interactive shell it fails with `EOTP`. `prepublishOnly` builds `dist/` so it ships in the package. Check the contents first with `npm pack --dry-run`.

## Style

- CommonJS with `'use strict'`, kebab-case file names, camelCase functions. Keep comments sparse.
- Do not use em dashes in code, comments, docs or commit messages.
- Record changes in `CHANGELOG.md` (Keep a Changelog).
