# Todo

## Line up with drumdrom
Bring fretdrom's repo hygiene level with drumdrom so both share one layout and one set of habits. Reference: https://github.com/morganp/drumdrom

- [x] `LICENSE` (MIT) and `license` field in `package.json`
- [x] `CHANGELOG.md` (Keep a Changelog, SemVer)
- [ ] `CONTRIBUTING.md`: setup, `npm test`, `npm run lint`, snapshot update flow, release steps
- [ ] `CLAUDE.md`: layout, commands, conventions (no em dashes, SemVer tags, never rewrite history)
- [ ] `schema/fretdrom.schema.json`: JSON Schema 2020-12 for chord, scale and chords inputs, and a `validate` API that collects all errors with code, path, line and column
- [ ] `docs/spec.md`: format specification with a version key, written from what `lib/parse.js` accepts today
- [ ] `scripts/render-fixtures.js`: render every `test/fixtures/*.json5` through each skin (default, dark, sketch, sketch dark); `npm run docs` writes `docs/images`, `npm run update-snapshots` writes `test/snapshots`. Today nothing in the repo generates the images, so they are committed by hand and drift
- [ ] Snapshot tests: SVG output diffs show up in review (drumdrom `test/snapshots`)
- [ ] `examples/index.html`: gallery page that loads the `dist` bundle
- [ ] `.github/workflows/ci.yml`: lint, test and build on Node 20 and 22, push and pull request (keep `deploy-dist.yml` for the dist branch)
- [ ] `package.json` `files`: add `schema/`, `docs/`; add `docs` and `update-snapshots` scripts
- [ ] Generate the 97 `docs/images` from the fixtures, never by hand: the script above is the only writer. Regenerate on every release (`npm run docs` in the release steps in `CONTRIBUTING.md`), and add a CI step that runs `npm run docs` then `git diff --exit-code docs/images`, so a stale image fails the build
- [ ] Check `docs/*.md` only reference images the script produces (`chords.md`, `scales.md`, `skins.md`, README); fail the script on a missing fixture or an orphan image
- [x] README loads the bundle from the `dist` branch via jsDelivr; `dist/` added to npm `files` with `prepublishOnly` build
- [ ] Publish the next npm release (needs `npm login`) so the unpkg URL stops returning 404; tag `v0.4.1` at that time

## Shared with drumdrom
- [ ] Extract common code (onml SVG helpers, wave string parsing, skins loader, error type) into one package once both stabilise
- [ ] Keep skin names and CLI verbs (`render`, `validate`, `json`) identical across both
