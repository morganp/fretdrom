# Scoredrom score container, draft 0

Status: Draft. Not implemented anywhere. Nothing in this document is shipped in fretdrom, drumdrom or any other package, and every statement is a proposal until a `scoredrom` release says otherwise.

Home: this file lives in the fretdrom repository (`docs/score-draft.md`) only until the `scoredrom` repository exists (ticket 8 in `todo.md`). It is then moved there unchanged, and the copy here is replaced by a link.

Words such as MUST and MUST NOT are used in the sense of RFC 2119. Terminology follows the drumdrom specification (https://github.com/morganp/drumdrom/blob/main/docs/spec.md) and the fretdrom specification (`docs/spec.md`): beat, step, bar, lane, wave, normalised model. Statements marked **Open** are undecided and are collected in section 14.

## 1. Purpose

A score is a container that puts several parts on one shared timeline: for example a bass tablature, a drum pattern and later a chord line, drawn one above the other in systems with aligned bar lines, with one title, one tempo and one skin.

The container adds no notation of its own. Each part is a standalone fretdrom or drumdrom document with its own parser, validator and renderer, and the score only:

1. holds the shared header (`name`, `subtitle`, `tempo`, `time`),
2. checks that the parts agree on the timeline,
3. aligns parts by musical position even when their grids differ,
4. merges configuration and skins, and
5. lays the parts out (section 8).

Non goals for the first draft: repeats and sections, tempo or time changes inside a score, pickup bars, pagination, playback.

## 2. Relation to the other formats

| Level | Format | Defined in |
| --- | --- | --- |
| 0 to 2 | `fretdrom` | `docs/spec.md` (this repository) |
| 0 to 2 | `drumdrom` | drumdrom `docs/spec.md` |
| 3 | `score` | this document |

The layered plan: a parser normalises any lower level document into the full model, so that a short form and a long form render identically. A score of one part MUST render the same as that part as a standalone document, apart from the shared header. Until the snapshots prove that, the standalone renderers keep their own code path (decision of 2026-10-25).

Planned package split: `dromkit` (errors, line and column locating, wave scanning, loaders, skins, SVG helpers, shared schema definitions, `layout`), `scoredrom` (this container: schema, parser, `parseAny`, CLI, bundle). The three repositories stay separate.

## 3. Document shape

A score file is a JSON5 document whose top level value is an object. Keys are snake_case and unknown keys are errors.

| Key | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `format` | `"score"` | yes | | Selects the score container. |
| `version` | integer | yes | | Format version. `1` in this draft. |
| `name` | string | no | `""` | Title. |
| `subtitle` | string | no | `""` | Second title line. |
| `tempo` | number | no | none | Beats per minute, 20 to 400 inclusive, as in drumdrom. |
| `time` | `[beats, unit]` | no | `[4, 4]` | Time signature for the whole score, as in drumdrom. |
| `steps_per_beat` | integer | no | `4` | Default grid resolution, 1 to 12, for every part that does not override it. |
| `config` | object | no | `{}` | Skin and layout overrides (sections 6 and 8). |
| `parts` | array | yes | | The parts, top to bottom. At least one. |
| `sections` | | reserved | | Reserved for repeats and structure. Rejected with `E_RESERVED_KEY`. |

A score has one `time`, one `tempo` and one bar sequence. Everything is measured in the bars of that time signature.

## 4. Parts

### 4.1 Part keys

A part is an object:

| Key | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"tab"` or `"drums"` | yes | Selects the part parser and renderer. |
| `name` | string | no | Label drawn in the left label column. Default `"Tab"` for `tab` and `"Drums"` for `drums`. An empty string draws no label. |
| `lanes` | array | yes | The lanes of the part, in the shape of the part type. |
| `steps_per_beat` | integer | no | Overrides the score `steps_per_beat` for this part, 1 to 12. |
| `config` | object | no | Overrides for this part only (section 6). |
| type specific keys | | | `drums`: `kit`. `tab`: none yet. |

A part MUST NOT have `time` (`E_PART_TIME`): a part cannot have a time signature of its own, because all parts share the score timeline. A part MUST NOT have `format`, `version`, `tempo` or `subtitle` (`E_PART_KEY`): those belong to the score. Unknown keys are `E_UNKNOWN_KEY`.

Because a part has no time signature, the fretdrom shorthand `config.bar` has no meaning in a part and is `E_PART_KEY`. Bars always come from the score `time`.

### 4.2 A part body is a standalone document

A part body is the standalone document of its type minus `format` and `version`, plus `type`, and with the document level header keys removed. This is the rule that lets any part be lifted out and rendered alone, or any standalone document be dropped into a score.

| Standalone | Part |
| --- | --- |
| fretdrom level 2 tab: `format`, `version`, `type: "tab"`, `name`, `subtitle`, `tempo`, `time`, `steps_per_beat`, `lanes` (or `tab`), `config` | `type: "tab"`, `name`, `steps_per_beat`, `lanes`, `config` |
| drumdrom: `format`, `version`, `name`, `subtitle`, `tempo`, `time`, `steps_per_beat`, `kit`, `lanes`, `config` | `type: "drums"`, `name`, `steps_per_beat`, `kit`, `lanes`, `config` |

Converting a standalone document to a part: delete `format`, `version`, `subtitle`, `tempo` and `time`, set `type`. The standalone `name` is kept as the part label. Converting a part to a standalone document: add `format`, `version` and the `time` of the score, and drop `type` for drumdrom. The wave alphabets, bar rules, lane rules and error codes inside a part are exactly those of the part's own specification, evaluated with the part's effective `steps_per_beat` and the score `time`.

For a `tab` part, `lanes` is the fretdrom lane array (`[{ name, wave }]`). The fretdrom wrapper spelling `tab:` is not accepted inside a part. Chord and scale documents are not parts in this draft (section 13).

### 4.3 Equal bar counts

Every part MUST have the same number of bars (`E_BAR_COUNT`, naming the parts and both counts). The number of bars of a part is its step count divided by its `steps_per_bar`, where `steps_per_bar = beats * steps_per_beat` with `beats` from the score `time`. The number of bars of the score is that common count. A part with a wave that is not a whole number of bars is an error of that part (`E_WAVE_LENGTH` and its relatives, with the path prefixed by `parts[i]`).

The strict length rule of the fretdrom specification (section 14.5, every segment a full bar, all lanes equal) applies inside a score part. The legacy tolerance of fretdrom level 0 does not.

## 5. Alignment

### 5.1 Musical position

The parts may have different `steps_per_beat`. Events are compared by musical position, never by step index. The position of a step is the fraction of the piece that has elapsed at that step, measured in bars:

```
steps_per_bar = beats * steps_per_beat          (per part)
p = bar + step_in_bar / steps_per_bar            (a rational number)
```

where `bar` is the zero based bar index and `step_in_bar` the zero based step within the bar. Two events are simultaneous if and only if their positions are equal.

To keep arithmetic exact, implementations MUST NOT compare positions as floating point numbers. They use the score grid: let `L` be the least common multiple of the `steps_per_bar` of all parts (`ticks_per_bar`). A tick is `1 / L` of a bar. The absolute tick of a step is

```
tick = bar * L + step_in_bar * (L / steps_per_bar)
```

`L / steps_per_bar` is an integer by construction. Positions are equal if and only if ticks are equal. Implementations SHOULD reject a score whose `L` is above 960 with `E_GRID` (**Open**: the bound).

### 5.2 Worked example

4/4 with a tab part at 2 steps per beat and a drum part at 4 steps per beat:

| | `steps_per_beat` | `steps_per_bar` |
| --- | --- | --- |
| tab | 2 | 8 |
| drums | 4 | 16 |

`L = lcm(8, 16) = 16`. A tab step is 2 ticks and a drum step is 1 tick.

| Event | bar | step_in_bar | p | tick |
| --- | --- | --- | --- | --- |
| tab, step 5 of bar 0 | 0 | 5 | 5/8 | 10 |
| drums, step 10 of bar 0 | 0 | 10 | 10/16 = 5/8 | 10 |

They are the same position, `p = 0.625`, which is 2.5 beats into the bar: the "and" of beat 3. Tab step 3 is tick 6, the same position as drum step 6. The odd drum steps (ticks 1, 3, 5, and so on) have no tab step.

A score with a tab at 3 steps per beat (triplet eighths) and drums at 4: `steps_per_bar` is 12 and 16, `L = 48`, a tab step is 4 ticks and a drum step is 3 ticks. The two grids coincide only every 12 ticks, on the beats.

## 6. Configuration and skins

### 6.1 Merge order

The effective skin of a part is built from three layers, later layers winning:

1. The common skin base: the skin named by the part's `config.skin`, else the score's `config.skin`, else `default`, restricted to the common keys (6.2) plus the keys of the part's own type.
2. The score `config`: every key except `skin` and the layout keys of section 8.
3. The part `config`: every key except `skin`.

The shared parts of the page (header, label column, connecting bar lines, system spacing) use the same construction with the score `config` only: the skin named by `config.skin` (default `default`), restricted to the common keys, then the score `config` overrides.

Unknown keys in `config` are `E_UNKNOWN_KEY` in a validating parser. A key that belongs to the other part type is accepted in a score `config` and ignored by a part it does not apply to, so one `config` can style a mixed score. In a part `config` a key of the other type is an error.

### 6.2 Common skin keys and proposed renames

The two renderers use different names for the same things. The score needs one vocabulary. The rule is that a common key exists in every skin, and that the old name stays accepted as an alias for as long as the format version is 1.

| Common key | drumdrom today | fretdrom today | Action |
| --- | --- | --- | --- |
| `bg_color` | `bg_color` | `bg_color` | none |
| `text_color` | `text_color` | none | add to fretdrom, default the `string_color` value |
| `title_color` | `title_color` | `title_color` | none |
| `subtitle_color` | `subtitle_color` | none (chord subtitles use `label_color`) | add to fretdrom, default the `label_color` value |
| `label_color` | `label_color` | `label_color` | none |
| `font_family` | `font_family` | `font_family` | none |
| `title_size`, `subtitle_size`, `tempo_size`, `label_size` | same | `title_size`, `subtitle_size`, `label_size` | add `tempo_size` to fretdrom |
| `bar_color` | `bar_color` | `tab_line_color` | fretdrom alias `tab_line_color` to `bar_color` |
| `bar_width` | `bar_width` | `bar_line_width` | fretdrom alias `bar_line_width` to `bar_width` |
| `margin_left`, `margin_right`, `margin_top`, `margin_bottom` | same | `tab_margin_left` and so on | fretdrom aliases `tab_margin_*` to `margin_*` |
| `row_gap` | `row_gap` | none | add to fretdrom |

Type specific keys keep their names: drumdrom `cell_w`, `row_h`, `label_w`, `count_h`, `mark_*`, `accent_color`, `ghost_color`, the `staff_*` family; fretdrom `tab_num_size`, `tab_num_color`, `tab_string_spacing`, `string_color`, `string_width`, and the chord and scale keys. One proposed rename: `tab_beat_w` to `tab_step_w`, because it is the width of one step column and not of a beat (alias kept). New keys used by the container only: `bars_per_system`, `part_gap`, `label_pad`, `connect_bars` (section 8).

If an alias and its target are both set in one `config` object, a validating parser reports `E_SKIN_ALIAS` and a lenient one uses the target. In a score a part renderer does not draw the title, subtitle or tempo: those come from the shared header, so `title_*`, `subtitle_*` and `tempo_size` of a part are inert.

**Open**: whether the renames land with fretdrom 0.5.0 (ticket 5) or with the first scoredrom release.

## 7. Normalised score model

`parseAny` and `parse` return this model for a score; the CLI prints it with `json`. Key order is fixed. Every default is filled.

| Key | Meaning |
| --- | --- |
| `format`, `version` | `"score"`, `1`. |
| `name`, `subtitle` | Strings, `""` when absent. |
| `tempo` | Number or `null`. |
| `time` | `[beats, unit]`, default applied. |
| `bars` | Common bar count. |
| `ticks_per_bar` | `L` (5.1). |
| `parts` | Parts in file order. |
| `parts[].type`, `name` | Type and label (default applied). |
| `parts[].steps_per_beat`, `steps_per_bar`, `steps` | Effective values. |
| `parts[].lanes` | The lanes of the part's own normalised model (fretdrom section 16.2 for `tab`, drumdrom section 7 for `drums`), each event extended with `tick`. |
| `parts[].config` | The part `config`, `{}` when absent. |
| `config` | The score `config`, `{}` when absent. |

The `tick` of an event is the absolute tick of section 5.1. `step`, `bar` and `step_in_bar` are the part's own and are kept so that a part can be re-derived. The model of each part, minus `tick` and the header keys, equals the model its standalone document would normalise to (apart from `format`, `version` and the placement of `time`).

Example (the score of section 12.3):

```json
{
  "format": "score",
  "version": 1,
  "name": "Groove",
  "subtitle": "",
  "tempo": 100,
  "time": [4, 4],
  "bars": 2,
  "ticks_per_bar": 16,
  "parts": [
    {
      "type": "drums",
      "name": "Drums",
      "steps_per_beat": 4,
      "steps_per_bar": 16,
      "steps": 32,
      "lanes": [
        { "id": "hh", "name": "Closed hi-hat", "gm": 42, "staff": 9, "head": "x", "hits": [
          { "step": 0, "bar": 0, "step_in_bar": 0, "tick": 0, "accent": "normal" },
          { "step": 2, "bar": 0, "step_in_bar": 2, "tick": 2, "accent": "normal" },
          { "step": 4, "bar": 0, "step_in_bar": 4, "tick": 4, "accent": "normal" },
          { "step": 6, "bar": 0, "step_in_bar": 6, "tick": 6, "accent": "normal" },
          { "step": 8, "bar": 0, "step_in_bar": 8, "tick": 8, "accent": "normal" },
          { "step": 10, "bar": 0, "step_in_bar": 10, "tick": 10, "accent": "normal" },
          { "step": 12, "bar": 0, "step_in_bar": 12, "tick": 12, "accent": "normal" },
          { "step": 14, "bar": 0, "step_in_bar": 14, "tick": 14, "accent": "normal" },
          { "step": 16, "bar": 1, "step_in_bar": 0, "tick": 16, "accent": "normal" },
          { "step": 18, "bar": 1, "step_in_bar": 2, "tick": 18, "accent": "normal" },
          { "step": 20, "bar": 1, "step_in_bar": 4, "tick": 20, "accent": "normal" },
          { "step": 22, "bar": 1, "step_in_bar": 6, "tick": 22, "accent": "normal" },
          { "step": 24, "bar": 1, "step_in_bar": 8, "tick": 24, "accent": "normal" },
          { "step": 26, "bar": 1, "step_in_bar": 10, "tick": 26, "accent": "normal" },
          { "step": 28, "bar": 1, "step_in_bar": 12, "tick": 28, "accent": "normal" },
          { "step": 30, "bar": 1, "step_in_bar": 14, "tick": 30, "accent": "normal" }
        ] },
        { "id": "sd", "name": "Snare", "gm": 38, "staff": 5, "head": "normal", "hits": [
          { "step": 4, "bar": 0, "step_in_bar": 4, "tick": 4, "accent": "normal" },
          { "step": 12, "bar": 0, "step_in_bar": 12, "tick": 12, "accent": "normal" },
          { "step": 20, "bar": 1, "step_in_bar": 4, "tick": 20, "accent": "normal" },
          { "step": 28, "bar": 1, "step_in_bar": 12, "tick": 28, "accent": "normal" }
        ] },
        { "id": "bd", "name": "Bass drum", "gm": 36, "staff": 1, "head": "normal", "hits": [
          { "step": 0, "bar": 0, "step_in_bar": 0, "tick": 0, "accent": "normal" },
          { "step": 8, "bar": 0, "step_in_bar": 8, "tick": 8, "accent": "normal" },
          { "step": 16, "bar": 1, "step_in_bar": 0, "tick": 16, "accent": "normal" },
          { "step": 22, "bar": 1, "step_in_bar": 6, "tick": 22, "accent": "normal" },
          { "step": 24, "bar": 1, "step_in_bar": 8, "tick": 24, "accent": "normal" }
        ] }
      ],
      "config": {}
    },
    {
      "type": "tab",
      "name": "Bass",
      "steps_per_beat": 2,
      "steps_per_bar": 8,
      "steps": 16,
      "lanes": [
        { "name": "A", "notes": [
          { "step": 0, "bar": 0, "step_in_bar": 0, "tick": 0, "fret": 3, "muted": false },
          { "step": 2, "bar": 0, "step_in_bar": 2, "tick": 4, "fret": 3, "muted": false },
          { "step": 4, "bar": 0, "step_in_bar": 4, "tick": 8, "fret": 5, "muted": false },
          { "step": 8, "bar": 1, "step_in_bar": 0, "tick": 16, "fret": 3, "muted": false },
          { "step": 10, "bar": 1, "step_in_bar": 2, "tick": 20, "fret": 3, "muted": false },
          { "step": 12, "bar": 1, "step_in_bar": 4, "tick": 24, "fret": 5, "muted": false },
          { "step": 14, "bar": 1, "step_in_bar": 6, "tick": 28, "fret": 5, "muted": false }
        ] },
        { "name": "E", "notes": [
          { "step": 0, "bar": 0, "step_in_bar": 0, "tick": 0, "fret": 0, "muted": false },
          { "step": 12, "bar": 1, "step_in_bar": 4, "tick": 24, "fret": 0, "muted": false }
        ] }
      ],
      "config": {}
    }
  ],
  "config": { "bars_per_system": 2 }
}
```

## 8. Layout

Layout is a pure function of the normalised model, a skin and a text measuring function. It is normative for the geometry of systems; the drawing inside a part belongs to the part renderer. It is written here as an algorithm so that a port (for example the Swift `ScoreKit`) can reproduce it exactly.

### 8.1 Terms

| Term | Meaning |
| --- | --- |
| system | One horizontal row: a run of consecutive bars, with every part stacked inside it. |
| content box | The rectangle a part draws into inside a system: from the first bar line to the last, `part.height` tall. |
| gutter | The area left of the first bar line inside a part (lane names such as `Snare` or the string names `e B G`). Its width is `part.gutter`. |
| label column | The area left of the gutters, holding the part names (`Drums`, `Bass`). |
| onset | A tick at which a part has an event (a note or a hit). |
| unit | The width in pixels of one tick inside a system. |

### 8.2 Config keys

Layout keys live in the score `config` (and are part of the common skin where they have a default):

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `bars_per_system` | integer 1 to 16 | 2 | Bars per system. |
| `part_gap` | number | 12 | Vertical gap between parts in a system. |
| `row_gap` | number | 20 | Vertical gap between systems. |
| `label_pad` | number | 8 | Padding on each side of the part label text. |
| `connect_bars` | boolean | `true` | Draw bar lines as one continuous line through all parts (8.6). |

### 8.3 The part contract

A part renderer MUST provide, for each system, a function with these inputs and outputs. This is the `layoutPart` API of ticket 6.

```
layoutPart(part, firstBar, barCount, skin) -> PartLayout

PartLayout {
  height  : number            content box height
  gutter  : number            minimum width of the left gutter (lane names)
  lead    : number            minimum distance from a bar line to the first tick of the bar
  onsets  : [ { tick: int,    absolute score tick, within the bars of this system
                w: number } ] minimum distance from this onset to the next onset
                              of the same part, or to the end of the bar if none
  draw    : (ctx) -> svg elements
}

DrawContext {
  x0      : number            x of the first bar line
  y       : number            top of the content box
  barX    : [number]          x of each bar line, barCount + 1 values
  xOf     : (tick) -> number  x for an absolute tick inside this system
  barlines: boolean           false when the layout draws the bar lines (connect_bars)
}
```

`onsets` contains one entry per distinct tick at which the part has an event in these bars. `w` is the narrowest advance the part tolerates after that onset: glyph width plus clearance, and for the last onset of a bar it includes the clearance to the bar line. `lead` is the clearance after a bar line. A part reports only needs, never positions. The part draws only inside `draw` and only with the positions it is given. A drum lane chart reports `w` of about the mark diameter, a tab part about the width of the widest fret label (two digits for 10 and above), a staff part the notehead plus accidental plus dot (a later phase).

### 8.4 Algorithm

Inputs: the score model, the effective skins, `measure(text, size, family) -> width`.

Outputs: `Layout { width, height, header, systems[] }`, where each system has `{ index, firstBar, barCount, y, height, x0, barX[], unit, parts[] { y, height } }`, plus the function `xOf(system, tick)`.

```
1.  L = score.ticks_per_bar;  B = score.bars;  n = barsPerSystem
2.  systems = chunks of bars [0..n), [n..2n), ... ; the last may be shorter
3.  header:  height Hh from title, subtitle and tempo lines (title_size,
             subtitle_size, tempo_size, title_gap); width needed Wh.
4.  labelW = max over parts of measure(part.name) + 2 * label_pad, or 0 if all names are empty
5.  for each system s:
      pl[p]  = layoutPart(part p, s.firstBar, s.barCount, skin_p)   for every part p
      G      = max over p of pl[p].gutter
      lead   = max over p of pl[p].lead
      per bar b in s, with k = tick of bar start:
         U_b = sorted distinct { k, k + L } and every onset tick of every part inside [k, k + L)
         for consecutive u_i, u_(i+1) in U_b:
             m_i = max over parts p that have an onset at u_i of that onset's w     (0 if none)
             need_i = m_i / (u_(i+1) - u_i)
      unit_s = max over all bars and i of need_i      (at least a skin minimum unit_min)
      barW_s = lead + unit_s * L
      fixed  = margin_left + labelW + G + margin_right
      natural_s = fixed + s.barCount * barW_s
6.   W = max( Wh + margin_left + margin_right, max over s of natural_s )
7.   for each system s except a short last system (Open, section 14):
         barW_s = (W - fixed) / s.barCount
         unit_s = (barW_s - lead) / L
8.   x0 = margin_left + labelW + G
     barX[j] = x0 + j * barW_s                      for j = 0 .. barCount
     xOf(s, tick) = barX[bar] + lead + unit_s * (tick - bar * L),   bar = floor(tick / L) - s.firstBar
9.   y: header at margin_top; systems below it. system height =
         sum of pl[p].height + (partCount - 1) * part_gap;
         parts stacked top to bottom in file order;
         consecutive systems are separated by row_gap.
10.  height = margin_top + Hh + sum of system heights + (systemCount - 1) * row_gap + margin_bottom
```

Properties that the algorithm guarantees and an implementation can test:

- Every onset of every part is at `xOf(s, tick)`, so equal ticks have equal x in all parts: this is the alignment of section 5.
- Spacing inside a system is proportional to time (`unit_s` is constant), and every part's `w` is satisfied: for consecutive ticks `u_i`, `u_(i+1)`, `unit_s * (u_(i+1) - u_i) >= m_i`.
- All bars of a system have the same width, because all bars have `L` ticks.
- All systems except a short last one have the same width `W`.
- The result depends only on the model, the skins and `measure`.

Arithmetic is IEEE double precision, with no rounding inside the algorithm; output coordinates are rounded when serialised (**Open**: rounding rule, shared with dromkit).

Worked numbers for the score of section 12.3 with illustrative needs: the drum part reports `w = 18` at each of its onsets, the tab part `w = 14`, `lead = 8`, `labelW = 60`, `G = 0` (no gutter in this illustration), `margin_left = margin_right = 16`, `bars_per_system = 2`. The onsets of both bars are the even ticks 0 to 14 (the drum hi-hat on eighths covers the tab ticks 0, 4, 8). Every gap `dt` is 2, so `need = 18 / 2 = 9` and `unit = 9`. A bar is `8 + 9 * 16 = 152` wide, `x0 = 76`, `barX = [76, 228, 380]`, the width is `380 + 16 = 396`. Tab fret 5 at tick 8 and the bass drum at tick 8 are at `76 + 8 + 9 * 8 = 156`. The tab E note at tick 24 and the bass drum at tick 24 are at `228 + 8 + 9 * 8 = 308`. The tab, which only needs 14 over a span of 4 ticks (3.5 per tick), follows the density of the drums.

### 8.5 Header

The shared header draws once, above the first system: `name` (title), `subtitle` and the tempo mark (`q = 100`, naming the beat unit as drumdrom does). The time signature is drawn by the parts that show one. A part never draws its own title. The tempo and time rules come from the score only.

### 8.6 Bar lines

With `connect_bars` (default), the layout draws each bar line as one vertical line from the top of the first part's content box to the bottom of the last, at every `barX[j]`, and a final double bar line at the end of the last system. The parts then draw with `barlines: false`. With `connect_bars: false` each part draws its own, as when standalone. A bar line is never drawn through the part label column.

### 8.7 Label column

Part names are drawn in the label column, vertically centred on the part's content box, right aligned to `margin_left + labelW - label_pad`, using `label_size`, `label_color` and `font_family`. The gutter (lane names) belongs to the part and is drawn by it, right aligned to `x0` minus its own padding.

## 9. `parseAny` and dispatch

`parseAny(input)` accepts JSON5 text or an object and returns `{ format, model }` for whichever of the three formats the input is. It exists in `scoredrom` because only the container knows all three.

Order:

1. If the input is text, parse JSON5, else `E_SYNTAX`. The value MUST be an object (`E_SCHEMA`).
2. If `format` is present: `"score"` goes to the score parser, `"drumdrom"` to drumdrom, `"fretdrom"` to fretdrom, anything else is `E_FORMAT`.
3. If `format` is absent, infer, first match wins:
   1. a top level `parts` array: `score` (in lenient mode, as for the other formats);
   2. any of `chord`, `chords`, `scale`, `tab`, or `lanes` whose entries have a `name` and no `id`: `fretdrom`;
   3. `kit`, or `lanes` whose entries have an `id`: `drumdrom`;
   4. otherwise `E_FORMAT` ("cannot determine the format").
   A `lanes` array with both kinds of entry, or with neither `id` nor `name`, is `E_AMBIGUOUS_FORMAT`.
4. The chosen parser runs and its model is returned.

In a score, each part is dispatched by its `type`: `"tab"` to the fretdrom tab parser, `"drums"` to the drumdrom parser. An unknown `type` is `E_PART_TYPE`. Format inference never applies inside a part.

## 10. Errors

The error model is that of drumdrom and of fretdrom strict mode: `code`, `message`, `path`, and for text input `line` and `column`; `validate` collects all errors, `parse` throws for the first with all on `err.errors`. An error found inside a part keeps the code of the part's own specification and has its `path` prefixed with `parts[i]`, for example `parts[1].lanes[0].wave` with `E_BAR_LENGTH`.

| Code | Meaning |
| --- | --- |
| `E_SYNTAX` | Not valid JSON5. |
| `E_SCHEMA` | Structural problem: type, range, enum, missing key. |
| `E_FORMAT` | `format` is not a known format, or cannot be inferred. |
| `E_AMBIGUOUS_FORMAT` | `parseAny` cannot tell fretdrom from drumdrom. |
| `E_VERSION` | `version` other than 1. |
| `E_UNKNOWN_KEY` | Unknown key at the score, part or config level. |
| `E_RESERVED_KEY` | `sections` used. |
| `E_NO_PARTS` | `parts` missing or empty. |
| `E_PART_TYPE` | Missing or unknown part `type`. |
| `E_PART_TIME` | A part has `time`. |
| `E_PART_KEY` | A part has `format`, `version`, `tempo`, `subtitle` or `config.bar`. |
| `E_BAR_COUNT` | Parts differ in bar count. |
| `E_GRID` | `ticks_per_bar` above the bound (5.1). |
| `E_SKIN_ALIAS` | A skin alias and its target both set (6.2). |
| `E_UNKNOWN_SKIN` | `config.skin` names no skin. |
| codes of the part formats | `E_BAD_CHAR`, `E_RESERVED_CHAR`, `E_BAR_LENGTH`, `E_WAVE_LENGTH`, `E_LANE_LENGTH`, `E_UNKNOWN_LANE`, `E_DUPLICATE_LANE` and the rest, with a `parts[i]` path. |

## 11. Phasing

| Phase | Content | Tickets in `todo.md` |
| --- | --- | --- |
| 1. Lane chart | Tab (the fretdrom lane/string chart) and drums (the drumdrom lane chart) on the shared timeline: `layoutPart`, `layout`, `scoredrom` 0.1.0, `parseAny`, CLI, bundle. | 6 to 8 |
| 2. Staff | Percussion staff in a score: `xOf` hook in drumdrom `render-staff.js`, so the staff aligns with the tab. | 9 |
| 3. More parts | Chord and scale block parts, techniques, sections and repeats. | 10 |
| 4. Port | Swift `ScoreKit` reading the normalised model, with golden fixtures. | 11 |

Phase 1 needs no new notation: both lane charts already place events by step. A staff of the tab itself (with note heads and a tab number row) is not planned.

## 12. Worked examples

### 12.1 Tab alone

A two string bass line, two bars at 4/4, 2 steps per beat. A standalone fretdrom level 2 document (planned syntax, section 15 of `docs/spec.md`):

```json5
{
  format: "fretdrom",
  version: 1,
  type: "tab",
  name: "Bass",
  time: [4, 4],
  steps_per_beat: 2,
  lanes: [
    { name: "A", wave: "|3.3.5...|3.3.5.5.|" },
    { name: "E", wave: "|0.......|....0...|" }
  ]
}
```

### 12.2 Drums alone

The same two bars of drums, a standalone drumdrom document (drumdrom specification section 4.2 syntax):

```json5
{
  format: "drumdrom",
  version: 1,
  name: "Drums",
  lanes: [
    { id: "hh", wave: "|x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.|" },
    { id: "sd", wave: "|....x.......x...|....x.......x...|" },
    { id: "bd", wave: "|x.......x.......|x.....x.x.......|" }
  ]
}
```

### 12.3 A score of both

Each part body is the standalone body of 12.1 and 12.2 without `format`, `version`, `time` and the document header, plus `type`. The drums part uses the score default `steps_per_beat` of 4; the tab part overrides it with 2.

```json5
{
  format: "score",
  version: 1,
  name: "Groove",
  tempo: 100,
  time: [4, 4],
  config: { bars_per_system: 2 },
  parts: [
    {
      type: "drums",
      name: "Drums",
      lanes: [
        { id: "hh", wave: "|x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.|" },
        { id: "sd", wave: "|....x.......x...|....x.......x...|" },
        { id: "bd", wave: "|x.......x.......|x.....x.x.......|" }
      ]
    },
    {
      type: "tab",
      name: "Bass",
      steps_per_beat: 2,
      lanes: [
        { name: "A", wave: "|3.3.5...|3.3.5.5.|" },
        { name: "E", wave: "|0.......|....0...|" }
      ]
    }
  ]
}
```

Both parts have 2 bars (drums 32 steps of 16 per bar, tab 16 steps of 8 per bar). `steps_per_bar` is 16 and 8, so `L = 16` and a tab step is 2 ticks. Selected events in ticks, which is what aligns the parts:

| Tick | Beat position | Drums | Tab |
| --- | --- | --- | --- |
| 0 | bar 0, beat 1 | hh, bd | A fret 3, E fret 0 |
| 4 | bar 0, beat 2 | hh, sd | A fret 3 |
| 8 | bar 0, beat 3 | hh, bd | A fret 5 |
| 16 | bar 1, beat 1 | hh, bd | A fret 3 |
| 24 | bar 1, beat 3 | hh, bd | A fret 5, E fret 0 |

The normalised model of this score is the example in section 7.

One system holds both bars (`bars_per_system` is 2). Section 8.4 gives the geometry for this score with illustrative part needs.

## 13. Not covered

- Chord and scale diagrams as parts. They are blocks without a time axis; how a block is placed on the timeline (at a bar, at a position, as a header row) is undecided (**Open**).
- Techniques in tab (`/ \ ~ ^`), reserved in fretdrom strict mode, and their rendering across the shared timeline.
- Sections, repeats, first and second endings, tempo and time changes. Reserved by `sections`.
- Pickup bars, polymeter (a part with its own time signature is deliberately forbidden), pagination, playback and MIDI export.

## 14. Open questions

1. The bound on `ticks_per_bar` (960 is a guess) and the exact error for a score above it.
2. Whether a short last system is stretched to the common width (`W`) or kept at natural width. Draft: kept natural. A skin key `stretch_last` is the likely switch.
3. The count row of the drum lane chart (beat numbers and subdivisions above the lanes): drawn once per system from the score grid, or by the drum part only. Draft: by the drum part only.
4. Whether the skin key renames of section 6.2 land in fretdrom 0.5.0 or with scoredrom 0.1.0, and the final name `tab_step_w`.
5. The rounding rule for serialised coordinates, shared with dromkit.
6. The `measure` function: injected by the host (a Swift port needs the platform text metrics). Whether the bundle provides a default (an approximation by character count) for headless rendering.
7. How chord and scale blocks, and techniques, sit on the timeline (section 13).
8. Pickup bars and a score whose parts legitimately differ in length (a drum fill at the end).
9. Whether `bars_per_system` may be `"auto"` (fit to a target width).
10. Whether a part may set its own `skin` (6.1 allows it, which can produce a mixed look).
11. Whether the part `name` default (`Tab`, `Drums`) is right, or an absent name should draw no label.
12. Whether `parseAny` format inference belongs to `dromkit` or `scoredrom`. Draft: `scoredrom`, since it must know all three formats.
13. How the percussion staff phase passes the shared `xOf` and how the drum `voices` option interacts with equal bar widths.

## 15. Verification of this draft

The draft is a proposal, so only the facts it builds on were checked. The drums example of 12.2, and the drums part of 12.3 turned back into a standalone document (adding `format`, `version`, and removing `type`), were validated with the drumdrom command line (`drumdrom validate`, read only, `ok`). The wave lengths of the tab part (16 steps, 2 bars of 8) and of the drum part (32 steps, 2 bars of 16), the tick values of the table in 12.3, the model in section 7 and the layout numbers of 8.4 (unit 9, bar width 152, `barX = [76, 228, 380]`, width 396) were computed with a throwaway script that implements the algorithm of 8.4 and the formula of 5.1. The fretdrom tab syntax in 12.1 is the planned level 2 syntax and does not run in 0.4.1.
