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

## Convergence with drumdrom and scores (layered format)
Decided 2026-10-25. Principle: the simplest syntax stays first class, and timing and score features layer on top without forcing anyone to use them. Today's `chord:` and `tab:` documents are the shorthand, not legacy: no deprecation, no migrate verb.

| Level | You write | Gives |
|---|---|---|
| 0 | `{ chord: { name: "Am", frets: "x02210" } }`, today's `tab:` rows | exactly what works now |
| 1 | add `time`, `tempo`, `steps_per_beat`, `\|` bar lines | real bars and tempo, all optional |
| 2 | add `format`, `version`, `type` | strict self-identifying file, schema validation |
| 3 | `format: 'score'` with `parts: [...]` | tab and drums on one timeline |

Rules:
- A parser normalises any level 0 or 1 document into the full internal model with defaults, so short and long forms render identically.
- `format` is optional (inferred from the top-level key, or from `type` in a score part). Required only for strict mode.
- `a`-`z` stay as frets 10-35 in the simple form. Techniques use non-letter symbols (`/ \ ~ ^`) and `(12)` style big frets once opted in at level 2. Open decision.
- Chord and scale diagrams stay separate document types under `format: 'fretdrom'`.
- Tab rows may be written `lanes: [{ name, wave }]` (new) or `tab: [...]` (today). Both accepted.
- Decisions taken: score format string `score`, packages `dromkit` (shared helpers) and `scoredrom` (score container), separate repos, tab default 4 steps per beat when `time` is given, standalone renderers keep their own path until snapshots prove "score of one part" is identical.

Tickets (order):
1. [ ] Hygiene against today's output (in progress): `scripts/render-fixtures.js`, snapshot tests, `ci.yml`, `CONTRIBUTING.md`, `CLAUDE.md`, `examples/index.html`, `package.json` files and scripts, docs images generated from fixtures. Release 0.4.1 (npm publish stays manual, fixes the unpkg 404)
2. [ ] `docs/spec.md` for fretdrom (levels 0 to 2) and a draft `scoredrom` spec
3. [ ] Create `dromkit`: errors, locate, wave scan, loader, skins, svg helpers, browser glue, ajv standalone validator build, shared schema defs
4. [ ] Move drumdrom onto dromkit (snapshots byte identical); make `format` and `version` optional there too
5. [ ] fretdrom levels 1 and 2: `time`, `tempo`, `subtitle`, `steps_per_beat`, `|` bars, `lanes`, `format`/`version`/`type`, schema + `validate()` with codes and line/column, CLI verbs `validate` and `json`, skin key aliases (`tab_*` to common keys)
6. [ ] `layoutPart` API (onsets, min widths, `draw(xOf)`) in fretdrom and drumdrom
7. [ ] dromkit `layout` (onset union, systems, header)
8. [ ] `scoredrom` 0.1.0: schema, parser, `parseAny`, CLI, bundle, dist deploy; tab + drum lane chart
9. [ ] Staff in a score (`xOf` hook in drumdrom `render-staff.js`)
10. [ ] Chord and scale block parts, techniques, sections and repeats
11. [ ] Swift `ScoreKit` reading the normalised model; golden fixtures

## Shared with drumdrom
- [ ] Keep skin names and CLI verbs (`render`, `validate`, `json`) identical across both
