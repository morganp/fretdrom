# Scale Diagrams

Scale diagrams support a `subtitle` key for displaying scale intervals below the title.

---

## Pentatonic Scales

### A Minor Pentatonic

```json5
{ scale: {
  name: "A Minor Pentatonic",
  subtitle: "R  b3  4  5  b7",
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
}}
```

![A Minor Pentatonic](images/scale_a_minor_penta_sub.svg)

Grid rows are strings low to high (E to e). Columns are fret positions starting at `start_fret`. Use `"R"` for the root note, `"x"` for other scale notes, and `"."` for empty positions.

---

## Major Scales

### G Major Scale

```json5
{ scale: {
  name: "G Major Scale",
  subtitle: "R  2  3  4  5  6  7",
  tuning: "EADGBE",
  start_fret: 3,
  num_frets: 5,
  grid: [
    ["R", ".", "x", ".", "x"],
    ["x", ".", "x", ".", "x"],
    [".", "x", "R", ".", "x"],
    [".", "x", "x", ".", "x"],
    ["x", ".", "x", ".", "x"],
    ["R", ".", "x", ".", "x"]
  ]
}}
```

![G Major Scale](images/scale_g_major.svg)

This is the standard three-notes-per-string pattern in position 2 (starting at fret 3). The `"R"` cells mark the root note G in red; all other scale tones use `"x"`.

---

## Subtitle options

The `subtitle` field is a free-form string. Common uses:

| Use | Example value |
|-----|---------------|
| Scale formula | `"R  2  b3  4  5  b6  b7"` |
| Pentatonic formula | `"R  b3  4  5  b7"` |
| Mode name | `"Dorian"` |
| Key + position | `"Key of A, Position 1"` |

---

## Grid cell reference

| Cell | Meaning |
|------|---------|
| `"R"` or `"r"` | Root note, rendered in accent colour |
| `"x"` or `"X"` | Scale note, filled dot |
| `"."` or `"-"` | Not in scale, empty position |
