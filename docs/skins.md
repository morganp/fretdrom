# Skins

Fretdrom has four built-in skins. Select one via the `--skin` CLI flag or the `config.skin` key inside your JSON5 source.

```bash
fretdrom -i chord.json5 --skin sketch > chord.svg
```

```json5
{ chord: { name: "C Major", frets: "x32010", config: { skin: "sketch" } } }
```

---

## default

Light background, charcoal lines, red root notes.

| Chord | Barre | Scale | Tab |
|-------|-------|-------|-----|
| ![C Major](images/chord_c_major.svg) | ![F Major](images/chord_f_barre.svg) | ![A Minor Pentatonic](images/scale_a_minor_penta.svg) | ![Intro Riff](images/tab_intro_riff.svg) |

---

## dark

Dark background, light lines, bright red root notes.

| Chord | Barre | Scale | Tab |
|-------|-------|-------|-----|
| ![C Major dark](images/chord_c_major_dark.svg) | ![F Major dark](images/chord_f_barre_dark.svg) | ![A Minor Pentatonic dark](images/scale_a_minor_penta_dark.svg) | ![Intro Riff dark](images/tab_intro_riff_dark.svg) |

---

## sketch

Warm off-white background with hand-drawn wobbly lines. Fret wires, strings, and the nut are rendered as deterministic cubic bezier paths instead of straight lines -- the same source always produces the same SVG.

| Chord | Barre | Scale | Tab |
|-------|-------|-------|-----|
| ![C Major sketch](images/chord_c_major_sketch.svg) | ![F Major sketch](images/chord_f_barre_sketch.svg) | ![A Minor Pentatonic sketch](images/scale_a_minor_penta_sketch.svg) | ![Intro Riff sketch](images/tab_intro_riff_sketch.svg) |

---

## sketch-dark

Dark background with the same hand-drawn line style.

| Chord | Barre | Scale | Tab |
|-------|-------|-------|-----|
| ![C Major sketch dark](images/chord_c_major_sketch_dark.svg) | ![F Major sketch dark](images/chord_f_barre_sketch_dark.svg) | ![A Minor Pentatonic sketch dark](images/scale_a_minor_penta_sketch_dark.svg) | ![Intro Riff sketch dark](images/tab_intro_riff_sketch_dark.svg) |

---

## Chord rows

A `chords` row inherits the skin of the whole diagram, so one `config.skin` styles every chord in it. Rows are too wide for a side-by-side table, so the four skins are stacked here.

```json5
{
  config: { skin: "sketch" },
  chords: [
    { name: "A Minor", frets: "x02210", fingers: "--231-" },
    { name: "C Major", frets: "x32010", fingers: "-32-1-" },
    { name: "G Major", frets: "320003", fingers: "21---3" }
  ]
}
```

**default**

![Chord row default](images/chord_row.svg)

**dark**

![Chord row dark](images/chord_row_dark.svg)

**sketch**

![Chord row sketch](images/chord_row_sketch.svg)

**sketch-dark**

![Chord row sketch dark](images/chord_row_sketch_dark.svg)

An entry can carry its own `config` to override the row's skin for that diagram alone -- useful for picking out one chord in a progression:

```json5
{
  config: { skin: "sketch" },
  chords: [
    { name: "A Minor", frets: "x02210" },
    { name: "C Major", frets: "x32010", config: { skin: "sketch-dark" } }
  ]
}
```

The gap between diagrams is the `chord_row_gap` skin key (default `16`), on top of each diagram's own margins.

---

## Combining skins with other features

Skins compose with all other diagram features -- intervals, subtitles, barre chords, and tunings all work the same way regardless of skin.

```json5
{ chord: {
  name: "E Major",
  frets:     "022100",
  intervals: ["R", "5", "R", "3", "5", "R"],
  config:    { skin: "sketch" }
}}
```
