[![NPM version](https://img.shields.io/npm/v/fretdrom.svg)](https://www.npmjs.org/package/fretdrom)

## Introduction

**Fretdrom** is a free and open source SVG rendering engine for stringed instrument diagrams. It converts a JSON5 description into SVG vector graphics for chord charts, scale boxes, and tablature.

Input is parsed from JSON5 -- a flexible superset of JSON that allows comments and unquoted keys. Diagrams can be embedded in web pages or generated from the command line.

Inspired by [WaveDrom](https://github.com/wavedrom/wavedrom). Input syntax compatible with [pelican-fretboard](https://github.com/morganp/pelican-fretboard).

---

## CLI

### Run with npx

```bash
npx fretdrom --input chord.json5 > chord.svg
```

### Global installation

```bash
npm install -g fretdrom
fretdrom --input chord.json5 --skin dark > chord.svg
fretdrom --input scale.json5 --output scale.svg
```

### Options

- `-i`, `--input <path>`: Path to the JSON5 source file (required)
- `-s`, `--skin <name>`: Skin name: `default` or `dark` (default: `default`)
- `-o`, `--output <path>`: Write to file instead of stdout
- `-h`, `--help`: Show help message

### Export to PNG

```bash
fretdrom -i chord.json5 | npx @resvg/resvg-js-cli - chord.png
```

---

## Web usage

### HTML pages

1. Add the script to your `<head>` or `<body>`:

```html
<script src="https://unpkg.com/fretdrom/dist/fretdrom.min.js" type="text/javascript"></script>
```

2. Call `processAll` on load:

```html
<body onload="FretDrom.processAll()">
```

3. Insert diagram source wrapped in a `<script>` tag:

```html
<script type="fretdrom">
{
  type: "chord",
  name: "C Major",
  tuning: "EADGBE",
  frets: ["x", 3, 2, 0, 1, 0],
  fingers: [null, 3, 2, null, 1, null]
}
</script>
```

Fretdrom finds all `<script type="fretdrom">` elements and replaces each with an inline SVG.

---

## Chord diagrams

```json5
{
  type: "chord",
  name: "C Major",
  tuning: "EADGBE",
  frets: ["x", 3, 2, 0, 1, 0],
  fingers: [null, 3, 2, null, 1, null],
  root_strings: [2]
}
```

![C Major chord diagram](docs/images/chord_c_major.svg)

Barre chords use the `barre` key:

```json5
{
  type: "chord",
  name: "F Major (barre)",
  tuning: "EADGBE",
  frets: [1, 1, 2, 3, 3, 1],
  fingers: [1, 1, 2, 3, 4, 1],
  root_strings: [1, 6],
  barre: { fret: 1, from_string: 1, to_string: 6 }
}
```

![F Major barre chord diagram](docs/images/chord_f_barre.svg)

### Chord keys

| Key | Description | Default |
|-----|-------------|---------|
| `name` | Diagram title | _(none)_ |
| `tuning` | String names low to high | `EADGBE` |
| `frets` | Fret per string, low to high. `"x"` = muted, `0` = open | required |
| `fingers` | Finger number per string. `null` = omit label | _(none)_ |
| `root_strings` | 1-indexed string numbers to show in accent colour | _(none)_ |
| `start_fret` | First fret shown. `1` draws a nut; higher values show a fret indicator | `1` |
| `barre` | `{fret, from_string, to_string}` -- draws a barre bar | _(none)_ |

---

## Scale diagrams

```json5
{
  type: "scale",
  name: "A Minor Pentatonic",
  tuning: "EADGBE",
  start_fret: 5,
  num_frets: 5,
  grid: [
    ["R", ".", ".", "x", "."],
    [".", "x", ".", ".", "."],
    [".", ".", "x", ".", "."],
    ["x", ".", ".", ".", "x"],
    [".", ".", "x", ".", "."],
    ["R", ".", ".", "x", "."]
  ]
}
```

![A Minor Pentatonic scale diagram](docs/images/scale_a_minor_penta.svg)

The `grid` is one row per string, low to high. Each row is an array of fret values. Column 0 = `start_fret`, column 1 = `start_fret + 1`, and so on.

| Cell value | Meaning |
|------------|---------|
| `"R"` or `"r"` | Root note -- rendered in accent colour |
| `"x"` or `"X"` | Scale note -- filled dot |
| `"."` or `"-"` | Not in scale -- empty |

### Scale keys

| Key | Description | Default |
|-----|-------------|---------|
| `name` | Diagram title | _(none)_ |
| `tuning` | String names low to high | `EADGBE` |
| `start_fret` | Fret number of the first column | `1` |
| `num_frets` | Width of the box in frets | `6` |
| `grid` | Array of rows, one per string | required |

---

## Tablature

```json5
{
  type: "tab",
  name: "Intro Riff",
  tuning: "EADGBE",
  bars: [
    { beats: [
      { strings: [null, null, null, null, 2, 0] },
      { strings: [null, null, null, null, null, 3] },
      { strings: [null, null, null, null, 2, null] },
      { strings: [null, null, null, null, null, 0] }
    ]},
    { beats: [
      { strings: [null, null, null, 2, null, null] },
      { strings: [null, null, null, null, null, null] },
      { strings: [null, null, null, 3, null, null] },
      { strings: [null, null, null, null, null, null] }
    ]}
  ]
}
```

![Intro Riff tablature](docs/images/tab_intro_riff.svg)

`strings` is ordered low to high (index 0 = lowest string). Values: `null` = no note, integer = fret number, `"x"` = mute.

### Tab keys

| Key | Description | Default |
|-----|-------------|---------|
| `name` | Diagram title | _(none)_ |
| `tuning` | String names low to high | `EADGBE` |
| `bars` | Array of bar objects, each with a `beats` array | required |

---

## Any fretted instrument

Set `tuning` to match your instrument. String count is inferred from the tuning length.

```json5
{ type: "chord", name: "E (bass)", tuning: "EADG", frets: [0, 2, 2, 1], fingers: [null, 2, 3, 1], root_strings: [1] }
```

![E bass chord diagram](docs/images/chord_bass_e.svg)

Common tunings: `BEADG` (5-string bass), `GCEA` (ukulele), `GDAE` (mandola), `DADGAD` (open D).

---

## Skins

The `config.skin` key selects a colour scheme:

```json5
{
  type: "chord",
  name: "C Major",
  frets: ["x", 3, 2, 0, 1, 0],
  config: { skin: "dark" }
}
```

![C Major dark skin](docs/images/chord_c_major_dark.svg)

| Skin | Description |
|------|-------------|
| `default` | Light background, charcoal lines, red root notes |
| `dark` | Dark background, light lines, bright red root notes |

---

## Node.js API

```js
const { renderSVG } = require('fretdrom');

const svg = renderSVG({
  type: 'chord',
  name: 'C Major',
  frets: ['x', 3, 2, 0, 1, 0]
});

// svg is a string of SVG markup
```

---

## License

See [LICENSE](LICENSE).
