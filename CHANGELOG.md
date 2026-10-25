# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning 2.0.0](https://semver.org).

## [Unreleased]

### Added

- `docs/spec.md`: the fretdrom format specification. Level 0 is documented from the 0.4.1 code, quirks included; levels 1 and 2 and the normalised model are planned for 0.5.0.
- `docs/score-draft.md`: draft specification of the `scoredrom` score container. Not implemented.

## [0.4.1] - 2026-10-25

No change to the input syntax or to rendered output.

### Added

- Snapshot tests: every fixture is rendered in every skin and compared byte for byte with `test/snapshots` (`npm run update-snapshots`).
- `scripts/render-fixtures.js` generates `docs/images` (`npm run docs`) and `test/snapshots` from `test/fixtures`. It fails on a fixture that does not render, an orphan image, or a README or docs reference to an image no fixture produces.
- CI workflow (`ci.yml`): lint, test and build on Node 20 and 22, plus a check that docs images and snapshots are current.
- `CONTRIBUTING.md` and `CLAUDE.md`.
- `examples/index.html`: gallery of chords, scales and tabs that loads the hosted bundle, or the local one with `?local`.
- The Deploy dist workflow lints and tests before deploying, writes `BUILD.txt`, purges the jsDelivr cache and pins each release tag as `dist-vX.Y.Z`. README documents the pinned form.
- `docs/` in the npm package `files`, and `docs` and `update-snapshots` scripts.
- `LICENSE` (MIT) and `license` field in `package.json`.
- This changelog, reconstructed from the git history.

### Fixed

- README script tag loads the bundle from the `dist` branch through jsDelivr. The old unpkg URL returned 404 because the npm package did not include `dist/`.
- `dist/` is in the npm `files` list and `prepublishOnly` builds it, so `unpkg.com/fretdrom/dist/fretdrom.min.js` works from this npm release.
- Docs images are generated from the fixtures. Six hand-made images (C major, F major barre, E minor, D major, G major chords and the G major scale) predated the thicker nut and the string taper and showed old output. Image file names are now the fixture names (`c_major.svg`, `c_major_dark.svg`); the `chord_*`, `scale_*` and `tab_*` copies were removed.

## [0.4.0] - 2026-08-10

### Added

- `chords` row type for side-by-side chord diagrams.
- Chord rows in the skins gallery (`docs/skins.md`).

### Changed

- `npm run lint` now works.

## [0.3.0] - 2026-07-02

### Fixed

- Chord window for 5th-fret barre shapes.
- Octave numbers are stripped from spaced tuning strings.

## [0.2.0] - 2026-06-18

### Added

- `renderSVG` API.
- Browser editor web app (`editor/`).
- CI workflow that publishes the `dist` bundles.

### Fixed

- Browser bundle exports via `module.exports` instead of a `window` assignment.

## Before 0.2.0 (April 2026)

### Added

- Chord and scale diagrams from a WaveDrom style input syntax, with unified layout engine.
- Subtitles, `intervals` key for per-dot harmonic labels, open string labels and root auto-detection.
- Skins, including a sketch (hand drawn) mode, and `docs/skins.md`.
- Per-string width taper with configurable `low_string` position.
- `files` allowlist in `package.json` to trim the published package.

### Changed

- `nut_width` increased from 4 to 6 for a clearer nut.

### Fixed

- `--skin` CLI flag was ignored.
- Fret indicator colliding with finger dots.
- Scale orientation and tab dash handling.
- A Minor intervals and the barre chord and pentatonic scale examples.

[Unreleased]: https://github.com/morganp/fretdrom/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/morganp/fretdrom/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/morganp/fretdrom/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/morganp/fretdrom/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/morganp/fretdrom/releases/tag/v0.2.0
