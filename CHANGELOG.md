# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning 2.0.0](https://semver.org).

## [Unreleased]

### Fixed

- README script tag now loads the bundle from the `dist` branch through jsDelivr. The old unpkg URL returned 404 because the npm package did not include `dist/`.
- `dist/` is now in the npm `files` list and `prepublishOnly` builds it, so `unpkg.com/fretdrom/dist/fretdrom.min.js` works from the next npm release.

### Added

- `LICENSE` (MIT) and `license` field in `package.json`.
- This changelog, reconstructed from the git history.

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

[Unreleased]: https://github.com/morganp/fretdrom/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/morganp/fretdrom/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/morganp/fretdrom/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/morganp/fretdrom/releases/tag/v0.2.0
