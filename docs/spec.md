# Fretdrom format specification

Status: level 0 is implemented and described as shipped in fretdrom 0.4.1. Levels 1 and 2 and the normalised model are planned for 0.5.0 and are written as proposals. Nothing in the planned parts is implemented yet.

Words such as MUST and MUST NOT are used in the sense of RFC 2119. This document follows the structure of the drumdrom specification (https://github.com/morganp/drumdrom/blob/main/docs/spec.md) so that the two formats read and behave alike.

Every section is tagged:

| Tag | Meaning |
| --- | --- |
| Implemented (0.4.1) | Describes what `lib/` does today. Derived from the code and checked by running it (section 20). |
| Planned (target 0.5.0) | A proposal. No code exists. Examples are tagged `fretdrom-planned` and are not run. |
| Open | A decision not yet taken (section 18). |

Code fences use an info string so tooling can tell them apart: `json5 fretdrom` is an implemented example that parses and renders, `json5 fretdrom-invalid` is an implemented example that is rejected (a `// error:` comment names the message), and `json5 fretdrom-planned` is a planned example that does not run today.

## 1. Overview

Fretdrom turns a JSON5 description of a fretted instrument diagram into SVG: chord diagrams, rows of chord diagrams, scale boxes and tablature. The syntax follows WaveDrom: the top-level key says what the diagram is, and tablature uses a compact one character per step wave string.

The format is layered. The simplest form stays first class and the extra structure is opt-in:

| Level | You write | Gives | Status |
| --- | --- | --- | --- |
| 0 | `{ chord: {...} }`, `{ scale: {...} }`, `{ chords: [...] }`, `{ tab: [...] }`, top-level `name` and `config` | exactly what works now | Implemented (0.4.1) |
| 1 | adds `time`, `tempo`, `subtitle`, `steps_per_beat`, `\|` bar separators, `lanes`, `(12)` big frets | real bars and tempo for tablature, all optional | Planned (target 0.5.0) |
| 2 | adds `format`, `version`, `type` | strict, self identifying file with error codes and schema validation | Planned (target 0.5.0) |
| 3 | `format: 'score'` with `parts: [...]` | tab and drums on one timeline | Out of scope here, see `docs/score-draft.md` |

Level 0 is not legacy. It is the shorthand, it is never deprecated and there is no migration verb. A parser normalises any level 0 or level 1 document into the full model of section 16 with defaults filled in, so short and long forms render identically.

Chord diagrams and scale diagrams stay separate document types. Only tablature gains a time axis.

## 2. File format

Applies to all levels.

- A file is a JSON5 document (https://json5.org). The top level value MUST be an object.
- Keys are snake_case.
- Text is UTF-8.
- The extension is not significant. The CLI accepts any path. `.json5` is the convention.

Implemented (0.4.1): the parser is lenient. An unknown key at any depth is silently ignored, except inside a `config` object, where unknown keys are skin overrides (section 10). There is no `version`. A document is recognised by the presence of one of the type keys (section 4).

Planned (target 0.5.0): a document that carries `format` is strict (section 15). A document without `format` stays lenient exactly as today.

# Part I. Level 0 (Implemented, 0.4.1)

Sections 3 to 13 describe fretdrom 0.4.1 as it behaves today, quirks included.

## 3. Top level keys

### 3.1 Implemented (0.4.1)

| Key | Type | Meaning |
| --- | --- | --- |
| `chord` | object | A chord diagram (section 5). Selects type `chord`. |
| `scale` | object | A scale box (section 7). Selects type `scale`. |
| `chords` | array | A row of chord diagrams (section 6). Selects type `chords`. |
| `tab` | array | Tablature lanes (section 8). Selects type `tab`. |
| `type` | string | One of `chord`, `chords`, `scale`, `tab`. Used only when none of the four keys above selects a type (section 4). |
| `name` | string | Title. Used by `tab`. Ignored for `chord` and `scale` documents written in the wrapped form (quirk Q5). Ignored by `chords`. |
| `tuning` | string or array | Default tuning (section 9). Used by `chords` and, in the flat form, by `chord` and `scale`. |
| `config` | object | Skin name, skin overrides and `bar` (section 10). |
| any other key | any | Ignored. |

### 3.2 Planned (target 0.5.0)

| Key | Type | Level | Meaning |
| --- | --- | --- | --- |
| `format` | `"fretdrom"` | 2 | Marks the document strict. Requires `version`. |
| `version` | integer | 2 | Format version, `1`. |
| `type` | string | 2 | Required with `format` when the body is flat (section 15.2). |
| `subtitle` | string | 1 | Second title line, `tab` only (chord and scale keep `subtitle` inside their object or flat body). |
| `tempo` | number | 1 | Beats per minute, 20 to 400, `tab` only. |
| `time` | `[beats, unit]` | 1 | Time signature, `tab` only. |
| `steps_per_beat` | integer | 1 | Grid resolution, 1 to 12, `tab` only. |
| `lanes` | array | 1 | Alternative spelling of `tab`. |

## 4. Document types and type detection

Implemented (0.4.1). `parse(source)` (`lib/parse.js`) turns the loaded object into a typed record. It requires `source` to be a truthy object, then detects the type with this precedence, first match wins:

| Order | Test | Type |
| --- | --- | --- |
| 1 | `Array.isArray(source.tab)` | `tab` |
| 2 | `Array.isArray(source.chords)` | `chords` |
| 3 | `source.chord !== undefined` | `chord` |
| 4 | `source.scale !== undefined` | `scale` |
| 5 | `source.type` is truthy | its value, which must be one of `chord`, `chords`, `scale`, `tab` |

If no test matches, the error is `Cannot determine diagram type: use { tab: [...] }, { chord: {...} }, { chords: [...] }, or { scale: {...} }`. If step 5 yields another value, the error is `Unknown type: <value>`.

Consequences, all of them current behaviour:

- `tab` as an object instead of an array does not select `tab` and falls through to the error above (the other tests fail too).
- When several type keys are present the earlier row wins and the others are ignored silently: `tab` beats `chords` beats `chord` beats `scale`. `{ type: 'scale', chord: {...} }` is a chord, because rows 1 to 4 are tried before `type`.
- An empty array still selects its type (`chords: []` selects `chords`) and is then rejected for being empty.

How the typed record is built from the source:

| Selected by | Record |
| --- | --- |
| `chord` key | `{ type: 'chord', ...source.chord }` (a shallow copy of the inner object). Only `source.config` is carried across, and only when the inner object has no `config` of its own. |
| `scale` key | `{ type: 'scale', ...source.scale }`, with the same `config` carry rule. |
| `tab`, `chords` key, or `type` | `{ ...source, type }`, a shallow copy of the whole document. |

The three forms of a chord document:

```json5 fretdrom
{ chord: { name: "C Major", frets: "x32010" } }
```

```json5 fretdrom
{ type: "chord", name: "C Major", frets: "x32010" }
```

```json5 fretdrom
{ config: { skin: "dark" }, chord: { name: "C Major", frets: "x32010" } }
```

The first is the wrapped form and the one the README documents. The second is the flat form selected by `type`; it works today and is not documented in the README. The third carries a document level `config` into the wrapped form.

Quirk Q5: in the wrapped form every key other than `config` that sits beside `chord` is dropped, so this title is not shown and this tuning is not used:

```json5 fretdrom
{ name: "Ignored title", tuning: "DADGAD", chord: { frets: "x32010" } }
```

`parse` is idempotent for output it produced: the typed record is itself a valid input (the flat form with `type`), and `renderSVG` parses its argument again, so `renderSVG(parse(x))` works.

## 5. Chord

Implemented (0.4.1). Source: `lib/parse.js`, `lib/render-chord.js`, `lib/render-fretboard.js`.

### 5.1 Keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | string | none | Title, centred above the diagram. |
| `subtitle` | string, `false` or `null` | see 5.5 | Second line. `false` or `null` suppresses it. |
| `tuning` | string or array | `EADGBE` | Section 9. Stored on the record but not used when drawing a chord. |
| `frets` | string or array | required | One entry per string, lowest string first (section 5.2). |
| `fingers` | string or array | all `null` | One label per string (section 5.3). |
| `intervals` | array | none | One label per string (section 5.4). |
| `root_strings` | array of integers | `[]` | 1 based string numbers (lowest string is 1) drawn in the root colour. |
| `start_fret` | integer | derived (5.6) | First fret shown. Only values greater than 1 take effect. |
| `barre` | object | none | `{ fret, from_string, to_string }`, strings 1 based from the lowest. |
| `config` | object | none | Section 10. |

The number of strings is the length of `frets`. The diagram is always `chord_num_frets` (5) frets tall.

### 5.2 Frets

`frets` is a string or an array. A value that is not an array is converted with `String(...)`, so the number `32010` works and is the string `"32010"`. A falsy value (`undefined`, `null`, `""`, `0`, `false`) throws `Chord requires frets`. An empty array throws `Chord frets must not be empty`.

String form: one character per string, lowest string first.

| Character | Meaning |
| --- | --- |
| `x` or `X` | muted string, drawn as a cross above the nut |
| `0` | open string |
| `1` to `9` | fret 1 to 9 |
| `a` to `z` | fret 10 to 35 (`a` is 10, `c` is 12, `z` is 35) |
| any other character | muted string, with no error |

The conversion checks `x`/`X` first, so `x` is always muted and fret 33 cannot be written (quirk Q3). Uppercase letters other than `X`, `-`, `.`, spaces and punctuation all become muted (quirk Q4).

Array form: the array is used as is, with no per element conversion. Numbers are frets. The strings `"x"` and `"X"` are muted. Other strings such as `"3"` are converted with `Number(...)` by the renderer, so `["x", "3", 2]` draws a fret 3 dot, but a letter like `"c"` is not converted and draws no dot, and the string `"0"` is not an open string (only the number `0` is) and draws nothing.

An open string (`0`) is drawn as a ring above the nut, or as a filled circle carrying the label when a finger or interval label is set for that string. A fretted string is drawn as a dot in the fret slot, filled with the root colour when it is a root (section 5.7).

```json5 fretdrom
{ chord: { name: "Em", frets: "022000", fingers: "-23---" } }
```

```json5 fretdrom
{ chord: { name: "Barre at 12", frets: "ccdd00" } }
```

### 5.3 Fingers

String form: one character per string, `-` or any non digit means no label, `1` to `4` (and in practice any digit except `0`) is the label. The conversion is `parseInt(c, 10) || null`, so `0` also means no label. Array form is used as is, labels are drawn with `String(...)`, `null` means no label. The length is not checked against `frets`: a short `fingers` leaves the remaining strings unlabelled.

```json5 fretdrom
{ chord: { name: "A Minor", frets: "x02210", fingers: "--231-" } }
```

### 5.4 Intervals

`intervals` MUST be an array to have an effect; any other value (including a string such as `"R35"`) is converted to `null` and ignored without an error (quirk Q8). Each entry is `"-"`, `null` or undefined for no label, else `String(entry)`. When intervals are present they replace `fingers` as the dot labels entirely; the two are never combined.

```json5 fretdrom
{ chord: {
  name: "E Major",
  frets: "022100",
  intervals: ["R", "5", "R", "3", "5", "R"]
} }
```

### 5.5 Subtitle

| `subtitle` | `intervals` | Subtitle shown |
| --- | --- | --- |
| `false` or `null` | any | none |
| non empty string | any | the string |
| absent, `""` or other falsy | present (an array, even empty) | `Intervals` |
| absent, `""` or other falsy | absent | none |

```json5 fretdrom
{ chord: { name: "C Major", subtitle: "1 - 3 - 5", frets: "x32010" } }
```

### 5.6 Fret window

The window is the five frets starting at `start_fret`. If the source `start_fret` is greater than 1 it is used. Otherwise the start is derived from the played frets: the lowest fret that is neither muted nor open, if that fret is 5 or higher, else 1. When the start is greater than 1 the number is printed to the left of the first slot and no nut is drawn (a plain line is drawn instead); when it is 1 a nut is drawn.

A fretted dot whose fret falls outside the five fret window is not drawn and there is no error (quirk Q11). With frets `x37` the window starts at 1, so the dot at fret 7 vanishes. Frets 0 and below are never drawn as dots.

```json5 fretdrom
{ chord: { name: "Cm shape at 8", frets: "x8aa98", fingers: "-13421" } }
```

A `start_fret` of 2 or more wins over the derived value. A `start_fret` of 1, 0 or less is not honoured: it falls through to the derivation, so it cannot force a nut when every played fret is 5 or higher, in spite of the README (quirk Q24). To show a window that starts below the lowest played fret, use 2 or more:

```json5 fretdrom
{ chord: { name: "Fm at 3", frets: "x35543", start_fret: 3 } }
```

### 5.7 Roots and barres

A string is drawn in the root colour when its 1 based number is in `root_strings`, or when its interval label is exactly `"R"` (case sensitive). An open string is a root only through the interval label.

`barre` draws a rounded bar from the string `from_string` to the string `to_string` (1 based, lowest string first, `to_string` greater than `from_string`) at fret `fret`, positioned relative to the window start. Its fields are not validated, and the barre does not change which dots are drawn.

```json5 fretdrom
{ chord: {
  name: "F Major (barre)",
  frets: "133211",
  fingers: "134211",
  root_strings: [1, 6],
  barre: { fret: 1, from_string: 1, to_string: 6 }
} }
```

### 5.8 Geometry

With the default skin a chord diagram is `chord_margin_left + (strings - 1) * cell_w + chord_margin_right` wide (260 for six strings) and `chord_margin_top + chord_num_frets * cell_h + chord_margin_bottom` tall (300). `name` does not change the size.


## 6. Chord rows

Implemented (0.4.1). Source: `lib/parse.js`, `lib/render-chords.js`.

A document with an array `chords` renders its entries side by side in one SVG.

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `chords` | array of objects | required, non empty | One chord per entry. |
| `tuning` | string or array | `EADGBE` | Default for entries that do not set their own. |
| `config` | object | none | Applies to the whole row; each entry may override it (section 10.4). |

Each entry is a chord object with the keys of section 5.1, written directly (not wrapped in `chord`). `type` is forced to `chord`, an entry `tuning` falls back to the row tuning, and the entry is normalised like a standalone chord. Entries MAY have different numbers of strings. The row is as tall as its tallest entry. The width is the sum of the entry widths plus `chord_row_gap` (default 16) between neighbours. Top level `name`, `subtitle` and anything else besides `tuning` and `config` are ignored for a row.

Errors: `Chords requires a non-empty chords array` (empty array), `Each chords entry must be an object` (any entry that is falsy or not an object), `Chord requires frets` (an entry without frets, which includes an entry written as `{ chord: {...} }`).

```json5 fretdrom
{
  tuning: "EADGBE",
  chords: [
    { name: "A Minor", frets: "x02210", fingers: "--231-" },
    { name: "C Major", frets: "x32010", fingers: "-32-1-" },
    { name: "G Major", frets: "320003", fingers: "21---3" }
  ]
}
```

```json5 fretdrom
{
  chords: [
    { name: "E (Bass)", tuning: "EADG", frets: "0221" },
    { name: "E Major",  tuning: "EADGBE", frets: "022100" }
  ]
}
```

```json5 fretdrom
{
  config: { skin: "sketch" },
  chords: [
    { name: "A Minor", frets: "x02210" },
    { name: "C Major", frets: "x32010", config: { skin: "sketch-dark" } }
  ]
}
```

## 7. Scale

Implemented (0.4.1). Source: `lib/parse.js`, `lib/render-scale.js`.

### 7.1 Keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | string | none | Title. |
| `subtitle` | string, `false` or `null` | see 7.3 | Second line. |
| `tuning` | string or array | `EADGBE` | Printed above the strings, one entry per string (section 9). |
| `start_fret` | number | `1` | Fret number of the first row. A non number is replaced by `1`; the renderer treats `0` as `1`. |
| `num_frets` | number | length of the first `grid` row, else `5` | Height of the box in frets. A non number is replaced. `0` is kept by `parse` but the renderer treats it as absent and uses the first row length. |
| `grid` | array of arrays | required, non empty | One row per string, lowest string first. Each row has one cell per fret. |
| `config` | object | none | Section 10. |

The README states a `num_frets` default of 6; the code derives it from the first row (quirk Q10). If the first `grid` entry is falsy the default is 5. Rows MAY differ in length: a missing cell is empty and cells beyond `num_frets` are not drawn. The number of strings is the number of rows. `Scale requires a non-empty grid array` is thrown when `grid` is not an array or is empty.

### 7.2 Cells

The grid is indexed `grid[string][fret_offset]`, so the diagram is drawn with strings as columns and frets as rows.

| Cell | Meaning |
| --- | --- |
| `"R"` or `"r"` | root: root colour, label `R` |
| `"x"` or `"X"` | scale note: dot without a label |
| `"."` or `"-"` | not in the scale: nothing drawn |
| `null`, undefined or `""` | nothing drawn |
| any other truthy value | interval label: dot with the value as its label (`"b3"`, `"4"`, the number `4`, even `"?"`) |

```json5 fretdrom
{ scale: {
  name: "A Minor Pentatonic",
  tuning: "EADGBE",
  start_fret: 5,
  num_frets: 5,
  grid: [
    ["R", ".", ".", "x", "."],
    ["x", ".", ".", "x", "."],
    ["x", ".", "x", ".", "."],
    ["x", ".", "x", ".", "."],
    ["x", ".", "x", ".", "."],
    ["R", ".", ".", "x", "."]
  ]
} }
```

```json5 fretdrom
{ scale: {
  name: "A Minor Pentatonic",
  start_fret: 5,
  num_frets: 4,
  grid: [
    ["R",  ".", ".", "b3"],
    ["4",  ".", "5", "." ],
    ["b7", ".", "R", "." ],
    ["b3", ".", "4", "." ],
    ["5",  ".", ".", "b7"],
    ["R",  ".", ".", "b3"]
  ]
} }
```

### 7.3 Subtitle

Same table as section 5.5, with the condition "present" replaced by "some cell is a truthy value other than `R`, `r`, `x`, `X`, `.` or `-`", which is the interval label test.

### 7.4 Drawing facts

Fret numbers (`start_fret` upward) are printed down the left side. Fret position markers are drawn on the right beside frets 3, 5, 7, 9, 12, 15, 17, 19 and 21. A nut is drawn only when the start is 1. Scale tuning labels are `tuning[s]` for string `s`, so a string tuning prints one character per string and an array tuning prints whole names (section 9).

## 8. Tab

Implemented (0.4.1). Source: `lib/parse.js`, `lib/parse-wave.js`, `lib/render-tab.js`.

### 8.1 Keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | string | none | Title, drawn left aligned above the staff. |
| `tab` | array of lane objects | required, non empty | Lanes, top lane first (normally the highest string). |
| `config` | object | none | Section 10. `config.bar` is the only tab specific key. |

A lane object has `name` (string, default `""`, drawn to the left of the lane) and `wave` (string, default `""`). `subtitle`, `tempo`, `time` and any other top level key are ignored. `tuning` is parsed and stored but not drawn. The order of lanes is the order drawn; lane 0 is the top line.

`Tab requires a non-empty tab array` is thrown for an empty `tab` array. A `wave` that is not a string (a number or an array) or a lane that is `null` throws a `TypeError` (quirk Q17).

### 8.2 Wave

A wave is a string with one character per beat position. The conversion (`lib/parse-wave.js`):

| Character | Result |
| --- | --- |
| `0` to `9` | fret 0 to 9 |
| `a` to `z`, except `x` | fret 10 to 35 (`a` is 10, `c` is 12) |
| `x` or `X` | muted, drawn as `x` |
| any other character | empty position, drawn as `-` |

So `.`, `-`, a space, `|`, `(`, an uppercase letter other than `X` and every other character are an empty position. In particular `.` is not special (quirk Q2): README says `.` is "empty beat" and the code agrees only because `.` falls in the default case. `x` is always muted, so fret 33 cannot be written (quirk Q3).

The number of columns is the length of the longest wave (minimum 1). A shorter wave simply has no marks after its end and gets no dashes. The wave is split by UTF-16 code unit, so a character outside the basic plane counts as two empty positions. A fret of 10 or more is drawn as its decimal digits in a column sized for one digit.

```json5 fretdrom
{ name: "Intro Riff",
  tab: [
    { name: "e", wave: "03.0...." },
    { name: "B", wave: "2.2....." },
    { name: "G", wave: "....2.3." },
    { name: "D", wave: "........" },
    { name: "A", wave: "........" },
    { name: "E", wave: "........" }
  ],
  config: { bar: 4 }
}
```

```json5 fretdrom
{ name: "Frets above 9 and mutes",
  tab: [
    { name: "e", wave: "a.c.x.0." },
    { name: "B", wave: "..." }
  ]
}
```

### 8.3 Bar lines

`config.bar` (a positive number of columns per bar) draws a bar line after every `bar` columns, but not at the very end. An opening bar line and a closing double bar line are always drawn, whatever `bar` is. A missing, zero or negative `bar` draws no inner bar lines. The value is not validated: `"4"` is coerced and works. If the length is not a multiple of `bar` the last bar is simply shorter.

| `config.bar` | Columns | Inner bar lines |
| --- | --- | --- |
| absent | 8 | none |
| 4 | 8 | after column 4 |
| 2 | 8 | after columns 2, 4, 6 |
| 8 | 8 | none (the end is not an inner line) |

### 8.4 Drawing facts

Width is `tab_margin_left + columns * tab_beat_w + tab_margin_right` and height is `tab_margin_top + (lanes - 1) * tab_string_spacing + tab_margin_bottom` (a six string, eight column tab is 380 by 130; `tab_beat_w` is the width of one column, a step, despite its name). The letters T, A, B are written in the left margin centred on the middle of the staff, one per row, and only on rows that exist (so a one lane tab shows only `A`). Sketch skins do not wobble tab lines (quirk Q14).

## 9. Tuning

Implemented (0.4.1). `parseTuning` (`lib/parse.js`) is applied to the document level `tuning` and to each `chords` entry (section 6). The result is stored on the record. Only scales draw it.

| Input | Result |
| --- | --- |
| falsy (absent, `""`, `null`) | `"EADGBE"` |
| a string containing a digit or a space | split on whitespace, every digit removed from each piece, pieces joined with no separator |
| any other string | unchanged |
| an array whose string form has no digit | unchanged (not validated) |
| a number, or an array whose string form has a digit (`["E2"]`) | `TypeError` from `split` |

| Source | Stored |
| --- | --- |
| `"EADGBE"` | `"EADGBE"` |
| `"DADGAD"` | `"DADGAD"` |
| `"E2 A2 D3 G3 B3 E4"` | `"EADGBE"` |
| `"E A D G"` | `"EADG"` |
| `"E2A2D3"` | `"EAD"` (digits are stripped even without spaces) |
| `"Eb2 Ab2"` | `"EbAb"` (names stay joined, so a scale prints `E`, `b`, `A`, `b`) |
| `["Eb", "Ab"]` | `["Eb", "Ab"]` (a scale prints `Eb` and `Ab`) |

The array form works for scale labels only because of the way labels are indexed; it is not documented in the README and is not a promise (quirk Q23). Octave information is discarded: there is no pitch model. A chord ignores its tuning when drawing, so the string count comes from `frets` alone. Alternate tunings are expressed by the user choosing the matching fret numbers.

```json5 fretdrom
{ chord: { name: "E (bass)", tuning: "EADG", frets: "0221", fingers: "-231", root_strings: [1] } }
```

```json5 fretdrom
{ scale: { name: "Drop D", tuning: "D2 A2 D3 G3 B3 E4", grid: [["R", "."], ["x", "."], ["x", "."], ["x", "."], ["x", "."], ["R", "."]] } }
```

## 10. Config and skins

Implemented (0.4.1). Source: `lib/resolve-skin.js`, `lib/render-any.js`, `lib/render-chords.js`, `skins/*.js`.

### 10.1 What `config` is

`config` is an object at the document level (or inside `chord`/`scale`; section 4). It has three kinds of key:

| Key | Meaning |
| --- | --- |
| `skin` | Name of the skin to start from (section 10.2). |
| `bar` | Tab bar width in columns (section 8.3). Not a skin key; removed before the overrides are applied. |
| any other key | A skin override: the value replaces that key of the chosen skin for this diagram. Not validated. |

### 10.2 Resolution

`resolveSkin(config, skins, defaultSkin, base)` returns the effective skin:

1. `chosen` is the first defined of: `skins[config.skin]`, `base`, `skins[defaultSkin]`, `skins.default`.
2. If `config` has any key other than `skin` and `bar`, the result is `{ ...chosen, ...overrides }`, else `chosen` itself.

`renderAny` calls it with `base` undefined and `defaultSkin` supplied by the caller. The CLI passes its `--skin` value (default `default`) as `defaultSkin`. `renderSVG` passes none, so the fallback is `default`.

Therefore:

- The document's `config.skin` beats the CLI `--skin` (the option is only a default; quirk Q12). Drumdrom is the other way round.
- An unknown name (`config.skin` or `--skin`) is not an error. It falls back silently to the next candidate.
- The override keys are free: a typo in a key name is ignored silently, and a wrongly typed value reaches the renderer unchecked. Any skin key may be overridden, including the boolean `sketch`.

```json5 fretdrom
{ chord: { name: "C Major", frets: "x32010", config: { skin: "dark" } } }
```

```json5 fretdrom
{ chord: { name: "Fat dots", frets: "x32010", config: { dot_r: 14, root_color: "#2060c0" } } }
```

### 10.3 Built in skins

| Name | Description |
| --- | --- |
| `default` | Light background, charcoal lines, red roots. |
| `dark` | Dark background, light lines. |
| `sketch` | `default` with a warm off white background, brown ink and `sketch: true`. |
| `sketch-dark` | `dark` with another background and `sketch: true`. |

Sketch mode (`sketch: true`, amplitude `sketch_amplitude`, 1.25 in the built in sketch skins) replaces the straight lines of the fretboard grid (nut, fret wires and strings) of chords and scales by deterministic wobbly paths. The same source always gives the same SVG. It does not affect dots, text, barres or any tab drawing (quirk Q14). Setting `sketch: true` as an override on any skin turns it on.

String width: the left (lowest) strings are thicker. With `string_width_low` set and `low_string` not `false`, string number `low_string` (1 based, default 1) has width `string_width_low` and the strings above it taper linearly back to `string_width`; the strings below it keep `string_width`. `low_string: false` makes all strings `string_width`. For a re-entrant tuning, `low_string` moves the thickest string from the first string to the lowest pitched one.

### 10.4 Rows

In a `chords` row the row `config` resolves once to the row skin. Each entry that has its own `config` then resolves with `base` set to the row skin:

- Entry without `skin`: starts from the row skin (including the row's overrides), then layers its own overrides.
- Entry with a known `skin`: starts from that built in skin and discards the row's overrides (quirk Q13). A row `dot_r` is lost on an entry that sets `skin`.
- Entry without `config`: uses the row skin.

### 10.5 Skin keys

Values are those of the `default` skin. Colour values differ in the other skins; see `skins/`. "Used by" lists the renderers that read the key.

| Key | Default | Used by |
| --- | --- | --- |
| `bg_color` | `#ffffff` | all |
| `string_color`, `fret_color`, `nut_color` | `#333333`, `#666666`, `#333333` | chord, scale (`string_color` also tab) |
| `dot_color`, `dot_text_color` | `#333333`, `#ffffff` | chord, scale |
| `root_color`, `root_text_color` | `#e63c3c`, `#ffffff` | chord, scale |
| `open_color`, `muted_color`, `barre_color` | `#333333` each | chord |
| `fret_marker_color` | `#cccccc` | scale |
| `title_color`, `label_color` | `#333333`, `#555555` | all |
| `tab_line_color`, `tab_num_color` | `#333333` | tab |
| `string_width`, `string_width_low`, `low_string` | 1.5, 3, 1 | chord, scale (`string_width` also tab) |
| `fret_width`, `nut_width` | 1, 6 | chord, scale |
| `bar_line_width` | 2 | tab |
| `font_family` | `Helvetica, Arial, sans-serif` | all |
| `title_size`, `subtitle_size`, `label_size`, `dot_text_size` | 14, 11, 11, 11 | chord, scale (`title_size`, `label_size` also tab) |
| `tab_num_size` | 12 | tab |
| `cell_w`, `cell_h`, `dot_r` | 40, 40, 12 | chord, scale (`dot_r`) |
| `chord_num_frets` | 5 | chord |
| `chord_margin_top`, `_left`, `_right`, `_bottom` | 70, 40, 20, 30 | chord |
| `chord_row_gap` | 16 | chords |
| `scale_margin_top`, `_left`, `_right`, `_bottom` | 70, 40, 30, 20 | scale |
| `tab_string_spacing`, `tab_beat_w` | 16, 40 | tab |
| `tab_margin_top`, `_left`, `_right`, `_bottom` | 40, 40, 20, 10 | tab |
| `sketch`, `sketch_amplitude` | unset, unset (the grid uses 1.5 when `sketch_amplitude` is unset) | chord, scale (grid lines) |

`cell_w` and `cell_h` size the fretboard grid of chords and scales.

## 11. Errors

Implemented (0.4.1). There are no error codes, no paths, no line or column numbers, and no validation pass. `parse` throws on the first problem and a plain `Error` carries only a message.

| When | Thrown | Message |
| --- | --- | --- |
| input is falsy or not an object | `Error` | `Input must be an object` |
| no type can be determined (including an array, `{}`) | `Error` | `Cannot determine diagram type: use { tab: [...] }, { chord: {...} }, { chords: [...] }, or { scale: {...} }` |
| `type` names something else | `Error` | `Unknown type: <value>` |
| chord without `frets` (or a falsy `frets`) | `Error` | `Chord requires frets` |
| chord with `frets: []` | `Error` | `Chord frets must not be empty` |
| `chords` empty | `Error` | `Chords requires a non-empty chords array` |
| a `chords` entry is not an object | `Error` | `Each chords entry must be an object` |
| `scale` without a non empty `grid` array | `Error` | `Scale requires a non-empty grid array` |
| `tab` empty, or `type: 'tab'` flat without `bars` | `Error` | `Tab requires a non-empty tab array` |
| `renderAny` given a source that was not parsed | `Error` | `Unknown type: undefined` |
| non string `wave`, non string `tuning` with a digit, `null` lane, malformed `grid` rows | `TypeError` | engine message such as `str.split is not a function` |

Things that are not errors: unknown top level keys, unknown skin names, unknown `config` keys, out of window frets, wrong length `fingers` and `intervals`, invalid wave characters, rows of different length, a `barre` with bad numbers.

Examples of rejected documents (each message is thrown by `parse` or the renderer):

```json5 fretdrom-invalid
{
  // error: Chord requires frets
  chord: { name: "No frets" }
}
```

```json5 fretdrom-invalid
{
  // error: Chords requires a non-empty chords array
  chords: []
}
```

```json5 fretdrom-invalid
{
  // error: Scale requires a non-empty grid array
  scale: { name: "No grid" }
}
```

```json5 fretdrom-invalid
{
  // error: Tab requires a non-empty tab array
  tab: []
}
```

```json5 fretdrom-invalid
{
  // error: Unknown type: banjo
  type: "banjo"
}
```

```json5 fretdrom-invalid
{
  // error: Cannot determine diagram type
  name: "Nothing to draw"
}
```

Quirk Q15, a document that passes `parse` and fails in the renderer with a `TypeError`:

```json5 fretdrom-invalid
{
  // error: Cannot read properties of undefined
  type: "tab",
  bars: [1]
}
```

Command line (`bin/cli.js`):

| Situation | Behaviour |
| --- | --- |
| no input file | usage line on stderr, exit 1 |
| unreadable file | `Error reading file: <message>` on stderr, exit 1 |
| JSON5 syntax error | `Error parsing JSON5: <message>` on stderr, exit 1 |
| error thrown by `parse` or the renderer | not caught: Node prints the stack trace on stderr and exits 1 |
| success without `-o` | the SVG and a newline on stdout, exit 0 |
| success with `-o <file>` | file written, `Written to <file>` on stdout, exit 0 |

Options are `-i`/`--input <file>`, `-o`/`--output <file>`, `-s`/`--skin <name>`, and a bare first argument that does not start with `-` is the input. A later `-i` overrides the bare argument. `-h` and `--help` are not implemented, contrary to the README: they are ignored and, with no input file, produce the usage line and exit 1. There is no `--version`, no stdin input and no `validate` or `json` verb (quirk Q18).

## 12. Current internal model

Implemented (0.4.1). `parse(source)` returns the typed record below, which `renderAny` reads. It is an implementation detail, not a stable interface, and the planned normalised model (section 16) replaces it as the contract. It is shown here because it is what exists.

| Type | Record |
| --- | --- |
| `chord` | `{ type, ...chord keys, tuning, frets (array), fingers (array, null filled), intervals (array or null, only if the key was present), root_strings (array) }` |
| `chords` | `{ ...source, type, tuning, chords: [chord records] }` where each chord record has `type: 'chord'` and the entry keys normalised as above |
| `scale` | `{ type, ...scale keys, tuning, start_fret, num_frets }` |
| `tab` | `{ ...source, type, tuning, lanes: [{ name, beats }] }`, `beats` being an array of numbers, `'x'` and `'-'` |

```json5 fretdrom
{ chord: { name: "C Major", frets: "x32010" } }
```

The record for this document is `{"type":"chord","name":"C Major","frets":["x",3,2,0,1,0],"tuning":"EADGBE","fingers":[null,null,null,null,null,null],"root_strings":[]}` (key order as produced by `Object.assign`).

## 13. Quirks of 0.4.1

These are facts about the current behaviour that a reader could mistake for a rule. Each is stated in its section; this is the index. None are fixed by this document. Levels 1 and 2 take a position on each (column "Planned").

| # | Quirk | Planned |
| --- | --- | --- |
| Q1 | The browser path (`<script type="fretdrom">` with `FretDrom.processAll`, and `FretDrom.renderElement`) never calls `parse`, so a source such as `{ chord: {...} }` fails with `Unknown type: undefined` and is logged with `console.error`. Only `FretDrom.renderSVG` and the Node API parse. Verified by calling `renderElement` with a stub element. | Fix is not part of this specification; the format is not affected. |
| Q2 | In a tab wave every character outside `0-9 a-z x X` is an empty position, including `.`, `-`, spaces and `\|`. | `\|` becomes a bar separator, `(` and `)` big fret delimiters (section 14). Other characters stay empty in lenient mode. |
| Q3 | `x` is muted, so fret 33 has no spelling. | Big fret `(33)` (section 14.4). |
| Q4 | Unknown characters in a chord `frets` string are muted strings; in a tab wave they are empty positions. | Same in lenient mode; errors in strict mode. |
| Q5 | In `{ chord: {...} }` and `{ scale: {...} }` only `config` is carried from the top level. A top level `name`, `subtitle` or `tuning` is dropped. `chord.config` replaces `config` entirely (no merge). | Strict mode reports the dropped key. |
| Q6 | A `chords` row ignores a top level `name` and `subtitle`. | Strict mode reports them. |
| Q7 | `fingers` and array `frets` are not normalised or length checked; `0` in `fingers` means no label. | Strict mode checks lengths. |
| Q8 | A non array `intervals` is ignored silently. | Error `E_SCHEMA`. |
| Q9 | A chord's `tuning` is stored but never drawn; a tab's too. | The tab model drops `tuning`; strict mode rejects it on a tab. |
| Q10 | `num_frets` defaults to the first row length (README says 6); `start_fret: 0` draws as 1; a string `start_fret` is replaced by 1. | Strict: integer checks. |
| Q11 | A chord dot outside the 5 fret window is dropped without a message. The automatic window starts at the lowest played fret only if that is 5 or higher. | Unchanged; strict mode MAY warn (open). |
| Q12 | `config.skin` beats the CLI `--skin`. An unknown skin name falls back silently. | `E_UNKNOWN_SKIN` in strict mode; precedence open (section 18). |
| Q13 | A row entry that sets `skin` discards the row's overrides. | Unchanged. |
| Q14 | Sketch mode only wobbles the fretboard grid of chords and scales. | Unchanged. |
| Q15 | `type: 'tab'` with a `bars` array passes `parse` and then throws a `TypeError` in the renderer; `type: 'tab'` with `lanes` is rejected; when both `tab` and `lanes` exist `lanes` is overwritten. | `lanes` becomes an alternative to `tab` (section 14.5). |
| Q16 | Type detection precedence is `tab`, `chords`, `chord`, `scale`, then `type`. Extra type keys are ignored. | Strict mode: `E_AMBIGUOUS_TYPE`. |
| Q17 | Some malformed shapes throw `TypeError`, others render garbage. | Validation (level 2). |
| Q18 | CLI: `-h`/`--help` unimplemented (README claims it); parse and render errors are uncaught stack traces. | Verbs `validate` and `json` and readable errors (ticket 5). |
| Q19 | A numeric `frets: 0` is "Chord requires frets"; a numeric `frets: 32010` is the string `"32010"`. | Unchanged. |
| Q20 | A fret of 10 or more is drawn as two digits in a one digit column. | Rendering metrics (open). |
| Q21 | `config.bar` is not validated; non integers and numeric strings are coerced. | Section 14.3. |
| Q22 | `subtitle: ""` counts as absent, so `intervals` still shows `Intervals`. | Unchanged. |
| Q23 | Array tunings happen to work for scale labels only, and an array with a digit in it throws. | Section 16.4. |
| Q24 | `start_fret: 1` (or 0) is not honoured by a chord: it is replaced by the derived start, so a nut cannot be forced when all frets are 5 or higher. The README says `1` draws a nut. | Section 16.3 normalises it to `null`. |

# Part II. Planned levels (target 0.5.0)

Everything from here to section 19 is a proposal for fretdrom 0.5.0 (tickets 5 to 6 of `todo.md`). Nothing below exists in 0.4.1. The examples are tagged `fretdrom-planned` and are not run. Part I stays true: a document that does not use a level 1 or level 2 feature behaves exactly as described in Part I, with the single exception listed in section 14.4 (the characters `|`, `(` and `)` in a tab wave).

## 14. Level 1: time, bars and lanes (Planned, target 0.5.0)

Level 1 gives tablature a time axis. It applies to `tab` documents only. All level 1 keys are optional. A document that uses none of them is a level 0 document.

### 14.1 Keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `subtitle` | string | `""` | Second title line. |
| `tempo` | number | none | Beats per minute, 20 to 400 inclusive. |
| `time` | `[beats, unit]` | see 14.3 | Time signature. `beats` is an integer 1 to 32, `unit` is one of 1, 2, 4, 8, 16, 32. |
| `steps_per_beat` | integer | see 14.3 | Grid resolution, 1 to 12. |
| `lanes` | array | | Alternative spelling of `tab` (section 14.6). |

These keys have the same names, types and ranges as in drumdrom. On a document of another type they are ignored in lenient mode and are `E_UNKNOWN_KEY` in strict mode.

### 14.2 Beats, steps and bars

Identical to drumdrom specification section 3.1. A beat is one unit of the time signature denominator. A step is `1 / steps_per_beat` of a beat. A bar has `steps_per_bar = beats * steps_per_beat` steps. `tempo` counts beats per minute.

| time | steps_per_beat | steps_per_bar | step length |
| --- | --- | --- | --- |
| 4/4 | 4 | 16 | sixteenth note |
| 4/4 | 2 | 8 | eighth note |
| 4/4 | 1 | 4 | quarter note |
| 3/4 | 4 | 12 | sixteenth note |
| 6/8 | 2 | 12 | sixteenth note (beats are eighth notes) |

Triplet and swing grids are not part of version 1.

### 14.3 Metered and unmetered documents, defaults

A tab document is metered when any of the following is present: `time`, `steps_per_beat`, `config.bar`, or `|` in any wave. Otherwise it is unmetered, which is exactly a level 0 tab.

The effective `time` and `steps_per_beat` are:

| Source | `time` | `steps_per_beat` |
| --- | --- | --- |
| `time` present | as given | given value, else `4` |
| no `time`, `config.bar` is N | `[N, 4]` | given value, else `1` |
| no `time`, no `config.bar`, metered by something else | `[4, 4]` | given value, else `4` |
| unmetered | `null` | `1` |

The second row is the compatibility rule: `config: { bar: 4 }` has always meant "four columns per bar", and a column is one step, so it maps to four quarter note beats with one step per beat. The first row follows the decision that a tab with an explicit `time` has 4 steps per beat unless said otherwise.

`config.bar` is accepted at every level as a spelling of `time`. It MUST be a positive integer (strict mode; lenient mode coerces as today). If `time` is also present, `config.bar` MUST equal `time[0]`, else `E_BAR_CONFLICT`. The normaliser removes `bar` from the model's `config`.

Legacy tolerance. When a document is unmetered, or is metered only by `config.bar`, the bar rules of section 14.5 that check lengths (all lanes equal, length a multiple of `steps_per_bar`) are not enforced: lanes may differ in length, and the last bar may be short, as today. The model records the actual number of steps (`steps`), so `steps` MAY be less than `bars * steps_per_bar` only in this case.

### 14.4 Wave alphabet for tablature

Planned additions to section 8.2. The wave is scanned left to right, one step per symbol.

| Symbol | Meaning | Lenient (no `format`) | Strict (`format` present) |
| --- | --- | --- | --- |
| `0` to `9` | fret 0 to 9 | yes | yes |
| `a` to `z` except `x` | fret 10 to 35 | yes | yes |
| `x`, `X` | muted note | yes | yes |
| `.`, `-` | rest | yes | yes |
| `\|` | bar separator, not a step (section 14.5) | yes | yes |
| `(` digits `)` | big fret, one or two decimal digits without a leading zero, value 0 to 36, one step | yes | yes |
| `/` `\` `~` `^` | reserved for techniques | rest | `E_RESERVED_CHAR` |
| any other character | | rest | `E_BAD_CHAR` |

The only characters whose meaning changes from 0.4.1 are `|`, `(` and `)`. Today they are rest steps (quirk Q2). A level 0 document that used them as rests will change; a document that uses only digits, letters, `x`, `X`, `.`, `-` and spaces renders as before. This is a documented breaking change of the 0.x minor release.

A `(` that is not closed by `)` after one or two digits, or a value out of range, is `E_BIG_FRET`. The index reported for wave errors counts characters as written in the string, separators and parentheses included, 0 based.

### 14.5 Bar rules

Mirroring drumdrom specification section 4.2:

- If a wave contains no `|`, its step count MUST be a multiple of `steps_per_bar` (`E_WAVE_LENGTH`). Several bars are allowed.
- If a wave contains any `|`, every segment between separators MUST have exactly `steps_per_bar` steps (`E_BAR_LENGTH`). One leading and one trailing separator are allowed. An empty segment between two separators is `E_BAR_LENGTH`.
- All lanes MUST have the same number of steps once separators are removed (`E_LANE_LENGTH`). The error names the lane and both lengths.
- `|` does not have to appear in every lane, and where it does the lanes' separators need not be at the same offsets as long as every segment is a full bar.

```json5 fretdrom-planned
{
  name: "Two bars",
  time: [4, 4],
  steps_per_beat: 1,
  lanes: [
    { name: "e", wave: "|03.0|....|" },
    { name: "B", wave: "|2.2.|....|" }
  ]
}
```

```json5 fretdrom-planned
{
  // expect: E_BAR_LENGTH
  time: [4, 4],
  steps_per_beat: 1,
  lanes: [{ name: "e", wave: "0123|45" }]
}
```

### 14.6 Lanes

`lanes: [{ name, wave }]` is an alternative spelling of `tab: [{ name, wave }]`. The objects have the same keys. Both spellings are accepted at every level. Providing both is `E_LANES_CONFLICT` (today `lanes` is silently overwritten, quirk Q15). The presence of `lanes` selects type `tab`.

Unlike drumdrom, where lane order is conventional and lanes are identified by a kit `id`, a tab lane is identified by its position: lane 0 is drawn on top and `name` is a free label. Duplicate names are allowed.

## 15. Level 2: format, version and type (Planned, target 0.5.0)

### 15.1 Keys

| Key | Type | Required | Meaning |
| --- | --- | --- | --- |
| `format` | `"fretdrom"` | no | Always `"fretdrom"`. Its presence turns on strict mode. |
| `version` | integer | yes if `format` is present | Format version. Always `1` in this specification. |
| `type` | string | see 15.2 | One of `chord`, `chords`, `scale`, `tab`. |

A document without `format` is lenient and behaves as in Part I plus level 1. `version` without `format` is accepted and checked (`E_VERSION` if not `1`). A document with `format` but no `version` is `E_SCHEMA` (missing key).

A value of `format` other than `"fretdrom"` is `E_FORMAT`. A document whose `format` is `"score"` belongs to the score container (`docs/score-draft.md`) and a fretdrom reader reports `E_FORMAT` with a message naming that format.

### 15.2 Inferring the format and the type

When `format` is absent, the document is read as `format: "fretdrom"`, `version: 1`, in lenient mode. The type is detected as in section 4, with `lanes` added after `tab`: the order is `tab`, `lanes`, `chords`, `chord`, `scale`, then `type`.

When `format` is present, the document is strict and the type is resolved so:

| Situation | Result |
| --- | --- |
| exactly one of `tab`, `lanes`, `chords`, `chord`, `scale` is present, and `type` is absent | the type that key implies |
| one such key and `type` agree | that type |
| one such key and `type` disagree | `E_TYPE_MISMATCH` |
| two or more such keys | `E_AMBIGUOUS_TYPE` |
| none of them, `type` present | the flat form: the keys of that type sit beside `format`, `version` and `type` |
| none of them, no `type` | `E_TYPE` |
| `type` is not one of the four | `E_TYPE` |

```json5 fretdrom-planned
{ format: "fretdrom", version: 1, type: "chord", name: "C Major", frets: "x32010" }
```

```json5 fretdrom-planned
{ format: "fretdrom", version: 1, chord: { name: "C Major", frets: "x32010" } }
```

These two are the same document.

### 15.3 Strict mode

Strict mode is what makes a typo an error instead of a silent no-op. It checks structure, types, ranges and unknown keys. In strict mode:

- An unknown key anywhere is `E_UNKNOWN_KEY`, with the path of the key. This includes a top level key that would be silently dropped today (quirks Q5, Q6), and keys that are valid only for another type.
- `config` keys are checked: `skin` MUST name a built in skin (`E_UNKNOWN_SKIN`), `bar` is valid for tab only, and every other key MUST be a skin key of section 10.5 with a value of type number, string or boolean. The skin keys are registered, not free.
- Types and ranges: `frets` is a string or an array of integers and `"x"`; `fingers` and `intervals` arrays have the same length as `frets` and `fingers` entries are 0 to 4 or `null`; `root_strings` entries are integers from 1 to the string count; `start_fret` is an integer 1 or more; `num_frets` an integer 1 to 24; `barre` has integer fields with `from_string` less than `to_string`; `grid` rows are arrays; `tempo`, `time`, `steps_per_beat` as in section 14.1.
- Lenient mode checks none of this and behaves as in Part I.

Allowed keys per type, besides `format`, `version` and `type`:

| Type | Keys |
| --- | --- |
| `chord` | `name`, `subtitle`, `tuning`, `frets`, `fingers`, `intervals`, `root_strings`, `start_fret`, `barre`, `config` |
| `chords` | `tuning`, `chords`, `config` (each entry: the `chord` keys without `type`) |
| `scale` | `name`, `subtitle`, `tuning`, `start_fret`, `num_frets`, `grid`, `config` |
| `tab` | `name`, `subtitle`, `tempo`, `time`, `steps_per_beat`, `tab` or `lanes`, `config` |

In the wrapped form the type key (`chord`, `scale`) holds the object with the keys above, and only `config` may sit beside it.

Reserved. The top level key `sections` and the top level key `parts` are reserved. `sections` is reserved for repeats and structure in a later version. `parts` belongs to the score container. Both are `E_RESERVED_KEY` in every mode (they are not read at all today, so no valid 0.4.1 document is affected). In a wave the characters `/ \ ~ ^` are reserved (section 14.4).

### 15.4 Errors

The error model is that of drumdrom. `validate(input)` returns `{ ok, errors }` and collects every error, `parse(source)` throws a `FretDromError` for the first problem with all problems on `err.errors`. Each error has:

| Field | Meaning |
| --- | --- |
| `code` | Stable code, see below. |
| `message` | Human readable. |
| `path` | Location in the document, for example `lanes[1].wave`, `chords[2].frets`. Empty for syntax errors. |
| `line`, `column` | 1 based position in the source text, present when the input was text. For a wave error they point at the offending character. |
| `index` | For wave errors, the 0 based character index inside the wave string. |

| Code | Meaning |
| --- | --- |
| `E_SYNTAX` | Not valid JSON5. |
| `E_SCHEMA` | Wrong type, range, enum, missing key (`format` without `version`, no `frets`, empty `grid`, empty `tab`, ...). |
| `E_FORMAT` | `format` is not `"fretdrom"`. |
| `E_VERSION` | `version` is an integer other than 1. |
| `E_TYPE` | No type can be determined, or `type` is unknown. |
| `E_TYPE_MISMATCH` | `type` disagrees with the wrapper key. |
| `E_AMBIGUOUS_TYPE` | More than one type key (strict mode only). |
| `E_UNKNOWN_KEY` | Unknown key (strict mode only). |
| `E_RESERVED_KEY` | `sections` or `parts` used. |
| `E_UNKNOWN_SKIN` | `config.skin` names no skin (strict mode only). |
| `E_BAD_CHAR` | Character outside the wave alphabet (strict mode only). |
| `E_RESERVED_CHAR` | Character reserved for a future version (strict mode only). |
| `E_BIG_FRET` | Malformed or out of range `(nn)` (every mode). |
| `E_BAR_LENGTH` | A segment between separators has the wrong length. |
| `E_WAVE_LENGTH` | A wave without separators is not a multiple of `steps_per_bar`. |
| `E_LANE_LENGTH` | Lanes differ in length. |
| `E_BAR_CONFLICT` | `config.bar` disagrees with `time`. |
| `E_LANES_CONFLICT` | Both `tab` and `lanes` are present. |

How today's errors (section 11) are reported in 0.5.0:

| 0.4.1 message | Code |
| --- | --- |
| `Input must be an object` | `E_SCHEMA` (empty path) |
| `Cannot determine diagram type: ...` | `E_TYPE` |
| `Unknown type: x` | `E_TYPE` |
| `Chord requires frets`, `Chord frets must not be empty` | `E_SCHEMA`, path `...frets` |
| `Chords requires a non-empty chords array`, `Each chords entry must be an object` | `E_SCHEMA` |
| `Scale requires a non-empty grid array` | `E_SCHEMA`, path `...grid` |
| `Tab requires a non-empty tab array` | `E_SCHEMA`, path `tab` |

Messages of an unchanged condition keep their 0.4.1 text where the text is still correct, so that scripts that grep them keep working.

The command line gains the verbs `validate` and `json` (print the normalised model), shared with drumdrom, and catches errors to print them as `file:line:column: CODE message`. The bare `fretdrom file.json5` stays the shorthand for `render`.

```json5 fretdrom-planned
{
  // expect: E_UNKNOWN_KEY at path "tmpo"
  format: "fretdrom",
  version: 1,
  type: "tab",
  tmpo: 100,
  lanes: [{ name: "e", wave: "0..." }]
}
```

```json5 fretdrom-planned
{
  // expect: E_RESERVED_CHAR at lanes[0].wave index 2
  format: "fretdrom",
  version: 1,
  type: "tab",
  lanes: [{ name: "e", wave: "0.~." }]
}
```

## 16. Normalised model (Planned, target 0.5.0)

`parse(source)` returns the model below, and `fretdrom json` prints it. A parser normalises any level 0, level 1 or level 2 document into it, filling every default and deriving every dependent value. Renderers read only the model, so two documents with the same model render identically. Key order is fixed so output can be diffed. Rests, unset optional keys and inferred values are all explicit in the model.

### 16.1 Common keys

| Key | Meaning |
| --- | --- |
| `format` | Always `"fretdrom"`. |
| `version` | Always `1`. |
| `type` | `chord`, `chords`, `scale` or `tab`. |
| `config` | The effective `config` copied, minus `bar`. `{}` when absent. |

### 16.2 Tab

| Key | Meaning |
| --- | --- |
| `name`, `subtitle` | Strings, `""` when absent. |
| `tempo` | Number, or `null`. |
| `time` | `[beats, unit]`, or `null` for an unmetered tab (section 14.3). |
| `steps_per_beat` | Integer, default applied. |
| `steps_per_bar` | `beats * steps_per_beat`; for an unmetered tab, equal to `steps`. |
| `steps` | Number of steps of the longest lane. |
| `bars` | `ceil(steps / steps_per_bar)`; `1` for an unmetered tab. |
| `lanes` | In drawn order, top first. Lanes without notes are kept. |
| `lanes[].name` | String, `""` when absent. |
| `lanes[].notes` | Sorted by `step`. |
| `notes[].step` | Zero based step across the whole tab. |
| `notes[].bar` | Zero based bar index (`0` for an unmetered tab). |
| `notes[].step_in_bar` | Zero based step within the bar. |
| `notes[].fret` | Integer 0 to 36, or `null` for a muted note. |
| `notes[].muted` | `true` for `x` and `X`, else `false`. |

Rests produce no note. Drawing columns come from `steps`.

### 16.3 Chord, chords and scale

| Type | Keys |
| --- | --- |
| `chord` | `name` (string, `""`), `subtitle` (`null` automatic, `false` none, or a non empty string), `tuning` (string, section 16.4), `frets` (array of integers and `"x"`), `fingers` (array, `null` filled, length of `frets`), `intervals` (array of strings and `null`, or `null`), `root_strings` (array of integers), `start_fret` (integer 2 or more, or `null` for automatic), `barre` (object or `null`) |
| `chords` | `tuning`, `chords`: array of chord models without `format`, `version` and `type`, each with the row tuning applied |
| `scale` | `name`, `subtitle` (as for a chord), `tuning`, `start_fret` (integer, default 1), `num_frets` (integer, default from the first row), `grid` |

`start_fret` of 1 or less normalises to `null` because that is how 0.4.1 treats it (quirk Q24).

### 16.4 Tuning

`tuning` stays a string in version 1 after octave stripping (section 9). Whether it becomes an array of note names is open (section 18).

### 16.5 Worked example: three spellings, one model

A level 0 document, two lanes of the intro riff:

```json5 fretdrom
{
  name: "Intro Riff",
  tab: [
    { name: "e", wave: "03.0...." },
    { name: "B", wave: "2.2....." }
  ],
  config: { bar: 4 }
}
```

The same document at level 1 (`lanes`, `time`, `steps_per_beat`, `|`):

```json5 fretdrom-planned
{
  name: "Intro Riff",
  time: [4, 4],
  steps_per_beat: 1,
  lanes: [
    { name: "e", wave: "|03.0|....|" },
    { name: "B", wave: "|2.2.|....|" }
  ]
}
```

The same document at level 2 (`format`, `version`, `type`):

```json5 fretdrom-planned
{
  format: "fretdrom",
  version: 1,
  type: "tab",
  name: "Intro Riff",
  time: [4, 4],
  steps_per_beat: 1,
  lanes: [
    { name: "e", wave: "03.0...." },
    { name: "B", wave: "2.2....." }
  ]
}
```

All three normalise to this model, byte for byte (the level 0 document goes through the second row of the table in 14.3):

```json
{
  "format": "fretdrom",
  "version": 1,
  "type": "tab",
  "name": "Intro Riff",
  "subtitle": "",
  "tempo": null,
  "time": [4, 4],
  "steps_per_beat": 1,
  "steps_per_bar": 4,
  "steps": 8,
  "bars": 2,
  "lanes": [
    {
      "name": "e",
      "notes": [
        { "step": 0, "bar": 0, "step_in_bar": 0, "fret": 0, "muted": false },
        { "step": 1, "bar": 0, "step_in_bar": 1, "fret": 3, "muted": false },
        { "step": 3, "bar": 0, "step_in_bar": 3, "fret": 0, "muted": false }
      ]
    },
    {
      "name": "B",
      "notes": [
        { "step": 0, "bar": 0, "step_in_bar": 0, "fret": 2, "muted": false },
        { "step": 2, "bar": 0, "step_in_bar": 2, "fret": 2, "muted": false }
      ]
    }
  ],
  "config": {}
}
```

This is the heart of the layering: the short form is not a different format, it is a different spelling of the same model. The renderer for level 0 documents MUST keep its current output byte for byte (the snapshot tests of `test/snapshots` are the check), so "the same model renders identically" is enforced on the existing fixtures before any new feature relies on it.

The chord equivalents are shorter. These three are the same chord:

```json5 fretdrom-planned
{ chord: { name: "C Major", frets: "x32010" } }
```

```json5 fretdrom-planned
{ type: "chord", name: "C Major", frets: "x32010" }
```

```json5 fretdrom-planned
{ format: "fretdrom", version: 1, type: "chord", name: "C Major", frets: "x32010" }
```

Their model:

```json
{
  "format": "fretdrom",
  "version": 1,
  "type": "chord",
  "name": "C Major",
  "subtitle": null,
  "tuning": "EADGBE",
  "frets": ["x", 3, 2, 0, 1, 0],
  "fingers": [null, null, null, null, null, null],
  "intervals": null,
  "root_strings": [],
  "start_fret": null,
  "barre": null,
  "config": {}
}
```

## 17. Versioning (Planned, target 0.5.0)

`version` is the format version, an integer. Version 1 is this document, Part I included. Levels are not versions: levels 0, 1 and 2 are all version 1, the levels being subsets of one format. A document without `version` is version 1.

A reader MUST reject a file whose `version` it does not support (`E_VERSION`). Reserved characters and keys are rejected in strict mode instead of ignored, so that files written for a later version do not silently lose meaning in an older strict reader. Lenient mode is the exception: it is exactly as forgiving as 0.4.1, and a document that relies on a future feature without declaring `format` is its author's risk.

The package follows Semantic Versioning 2.0.0, separately from the format version. While the package is 0.x, a minor release MAY make a breaking change, and the only one planned for 0.5.0 is section 14.4. A change to the model that adds a key is additive; a change that renames, removes or reinterprets a key bumps `version`.

## 18. Reserved items and open decisions

### 18.1 Reserved (rejected in strict mode, ignored in lenient mode unless stated)

- Keys: `sections`, `parts` (every mode).
- Wave characters `/` `\` `~` `^`, intended for slides up and down, vibrato and bends (proposal).
- Planned consumers: MIDI export, ASCII tab import and export, MusicXML, the score container, a Swift package that reads the model (`ScoreKit`).

### 18.2 Open decisions

| # | Decision | Current proposal |
| --- | --- | --- |
| O1 | Letters `a` to `z` as frets 10 to 35 versus technique characters (`h` hammer on, `p` pull off, `s` slide, `b` bend, `t` tap, `r` release). | **Open.** Letters stay frets at levels 0 and 1, because they are the existing syntax. Techniques use non letter symbols (`/ \ ~ ^`) and big frets are written `(12)`. The technique symbols are reserved now and take effect only in strict mode after an opt in (level 2). Revisit only if a technique set is needed that symbols cannot express. |
| O2 | Fret 33 has no spelling because `x` is muted. | `(33)` in the big fret syntax. Accepted. |
| O3 | Unmetered tab in the model: `time: null` with `steps_per_bar = steps`. | Proposed. The alternative, `time: [steps, 4]`, breaks past 32 steps. |
| O4 | Where `tempo` and `subtitle` are drawn on a tab, and whether the tempo label names the unit (`q = 100`) as in drumdrom. | Same placement and text as drumdrom. Decided with the renderer (ticket 5). |
| O5 | Column width at 4 steps per beat. `tab_beat_w` is per step today (40), so a 4/4 bar at 4 steps per beat is 640 wide. | Keep the key and the default for level 0 snapshots. Level 1 documents with `time` MAY get a narrower default. Open. |
| O6 | `tuning` as an array of note names. | String for now. An array allows `Eb`; a later version MAY accept both. |
| O7 | `config.skin` versus the CLI `--skin`. | Drumdrom lets the CLI win. Fretdrom lets the document win. Align in 0.5.0 (CLI wins) or leave. Open. |
| O8 | Big fret range 0 to 36. | Proposed. |
| O9 | Line wrapping of long tabs (`bars_per_row`). | Not in 0.5.0. A score has `bars_per_system` (score draft). |
| O10 | Warning channel for non fatal findings in strict mode (a dot outside the window, quirk Q11). | None in 0.5.0. |

## 19. Compatibility with drumdrom

Fretdrom and drumdrom are siblings with the same habits. This table lists what is shared and what differs on purpose.

| Topic | drumdrom | fretdrom | Reason |
| --- | --- | --- | --- |
| File syntax | JSON5, snake_case, UTF-8 | same | |
| `format` | `"drumdrom"`, required | `"fretdrom"`, optional, turns on strict mode | Level 0 documents predate it and stay valid. |
| `version` | required, `1` | required with `format`, else absent means `1` | same |
| Unknown keys | error | error in strict mode, ignored in lenient mode | Compatibility with 0.4.1. |
| `name`, `subtitle` | top level strings | same for tab; chord and scale keep them inside the object (wrapped form) | The wrapped form is the shorthand. |
| `tempo`, `time`, `steps_per_beat` | same keys, same ranges | same, tab only; defaults depend on `config.bar` (14.3) | A tab column is a step and `config.bar` counts columns. |
| Default `steps_per_beat` | 4 | 4 with `time`, 1 with `config.bar` | Same as above. |
| Lanes | `lanes: [{ id, wave, name?, staff? }]`, order conventional | `lanes: [{ name, wave }]`, order is the drawing order; `tab` is an equal spelling | A tab lane is a string, not a kit instrument. |
| Wave | `.` `-` rests, `x X o O f` hits, `\|` bars | `.` `-` rests, frets, `x` mute, `\|` bars, `(nn)` big frets | A tab step holds a fret number. |
| Bar rules | segments are full bars, equal lane lengths | same (14.5), with legacy tolerance for level 0 | Same grid logic; level 0 never enforced it. |
| Reserved characters | `r b d ^ 1-9` | `/ \ ~ ^` | Different technique vocabulary. |
| Reserved keys | `sections` | `sections`, `parts` | `parts` is the score container. |
| `config` | `skin`, `bars_per_row`, `voices`, skin keys | `skin`, `bar` (alias of `time`), skin keys | Different layouts. |
| Skins | `default`, `dark` | `default`, `dark`, `sketch`, `sketch-dark` | Fretdrom shipped sketch skins first. |
| Skin precedence | `-s` option beats `config.skin` | `config.skin` beats `--skin` | Open O7. |
| Error model | `E_*` codes, `path`, `line`, `column`, `validate()` | same model in strict mode (15.4); plain `Error` today | Ticket 5. |
| Normalised model | `bars`, `lanes[].hits` | `bars`, `lanes[].notes`, `steps` | Notes carry a fret, hits carry an accent. |
| CLI verbs | `render`, `validate`, `json` | same planned; bare file stays `render` | Shared habit (ticket 5). |
| Multi part files | not a feature | not a feature; see the score container | The score container hosts both. |

## 20. Verification

Written against fretdrom 0.4.1 (commit `2a1e9d8`, tag `v0.4.1`). Statements about current behaviour (Part I) were derived from `lib/parse.js`, `lib/parse-wave.js`, `lib/resolve-skin.js`, `lib/render-*.js`, `skins/*.js` and `bin/cli.js`, cross checked against `test/*.test.js` and `test/fixtures/*.json5`, and then confirmed by running the code. Part II is a proposal and was not run.

Commands run from the repository root:

- `node bin/cli.js <file> -s <skin>` for every `json5 fretdrom` example in this document (25 examples) in all four skins (`default`, `dark`, `sketch`, `sketch-dark`): each exited 0 and printed an SVG.
- `require('./lib').renderSVG(json5.parse(example))` for the same examples, and for the seven `json5 fretdrom-invalid` examples, checking that each throws the message named in its `// error:` comment.
- Assertions through `require('./lib')` for the tables of sections 4, 5, 6, 7, 8, 9 and 10: type detection precedence, the wrapped form dropping `name` and `tuning`, frets, fingers and intervals conversions, the subtitle table, the tuning table, the `start_fret` rule (including `start_fret: 1` rendering identically to no `start_fret`), `num_frets` and `start_fret` defaults, wave conversion, `config.bar` inner bar line counts for absent, 4, 2, 8, 0, -1 and `"4"`, SVG sizes (260 by 300 chord, 380 by 130 tab), skin resolution (`config.skin` over the CLI default, unknown name fallback, a row entry skin discarding row overrides), idempotence of `parse`.
- `node bin/cli.js -h`, `--version`, a file with a semantic error, a file with a syntax error, a missing file, and `-o`: exit codes and stderr text as listed in section 11 (a semantic error is an uncaught stack trace with exit 1).
- `require('./lib/render-element')(0, { chord: {...} }, stub)` throws `Unknown type: undefined`, confirming quirk Q1.
- The scripts used were throwaway files outside the repository. `npm test` and `npm run lint` were run and are green; `npm run docs` and `npm run update-snapshots` leave no diff, because this file adds no image.

Items that could not be derived from code and are judgement calls: the proposed `time`/`steps_per_beat` defaults (14.3), the strict range checks (15.3), the big fret range (O8) and the error codes (15.4).
