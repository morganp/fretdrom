'use strict';

const w3 = require('./w3');

const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

function renderScale(source, skin) {
  const {
    scale_cell_w: CW, scale_cell_h: CH, scale_dot_r: DR,
    scale_margin_top: MT, scale_margin_left: ML, scale_margin_right: MR, scale_margin_bottom: MB,
    bg_color, string_color, fret_color, nut_color, nut_width,
    dot_color, root_color, root_text_color, dot_text_color,
    fret_marker_color, font_family, title_size, label_size, dot_text_size,
    string_width, fret_width, title_color, label_color
  } = skin;

  const grid = source.grid;
  const startFret = source.start_fret || 1;
  const numFrets = source.num_frets || (grid[0] ? grid[0].length : 5);
  const tuning = source.tuning || 'EADGBE';
  const name = source.name || '';

  const numStrings = grid.length;

  // strings run as columns (x-axis), frets run as rows (y-axis)
  const gridW = (numStrings - 1) * CW;
  const gridH = (numFrets - 1) * CH;

  const svgW = ML + gridW + MR;
  const svgH = MT + gridH + MB;

  function xStr(s) { return ML + s * CW; }
  function yFret(f) { return MT + f * CH; }

  function isRoot(v) { return v === 'R' || v === 'r'; }
  function isNote(v) { return isRoot(v) || v === 'x' || v === 'X'; }

  const elems = [];

  elems.push(['rect', { x: 0, y: 0, width: svgW, height: svgH, fill: bg_color }]);

  if (name) {
    elems.push(['text', {
      x: svgW / 2, y: MT - 28,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: title_color, 'font-family': font_family,
      'font-size': title_size, 'font-weight': 'bold'
    }, name]);
  }

  // tuning labels along the top
  for (let s = 0; s < numStrings; s++) {
    elems.push(['text', {
      x: xStr(s), y: MT - 12,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, tuning[s] || '']);
  }

  // nut at top when diagram starts at fret 1
  if (startFret === 1) {
    elems.push(['rect', {
      x: ML, y: MT - nut_width,
      width: gridW, height: nut_width,
      fill: nut_color
    }]);
  }

  // string lines (vertical columns)
  for (let s = 0; s < numStrings; s++) {
    elems.push(['line', {
      x1: xStr(s), y1: MT, x2: xStr(s), y2: MT + gridH,
      stroke: string_color, 'stroke-width': string_width
    }]);
  }

  // fret lines (horizontal rows)
  for (let f = 0; f < numFrets; f++) {
    elems.push(['line', {
      x1: ML, y1: yFret(f), x2: ML + gridW, y2: yFret(f),
      stroke: fret_color, 'stroke-width': fret_width
    }]);
  }

  // fret number labels down the left side
  for (let f = 0; f < numFrets; f++) {
    elems.push(['text', {
      x: ML - 8, y: yFret(f),
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, String(startFret + f)]);
  }

  // fret position markers on the right side
  for (let f = 0; f < numFrets; f++) {
    if (FRET_MARKERS.has(startFret + f)) {
      elems.push(['circle', {
        cx: ML + gridW + 14, cy: yFret(f),
        r: 4, fill: fret_marker_color
      }]);
    }
  }

  // note dots
  for (let s = 0; s < numStrings; s++) {
    const row = grid[s] || [];
    for (let f = 0; f < numFrets; f++) {
      const cell = row[f];
      if (!isNote(cell)) continue;
      const cx = xStr(s);
      const cy = yFret(f);
      const fill = isRoot(cell) ? root_color : dot_color;
      const textFill = isRoot(cell) ? root_text_color : dot_text_color;
      elems.push(['circle', { cx, cy, r: DR, fill }]);
      if (isRoot(cell)) {
        elems.push(['text', {
          x: cx, y: cy,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          fill: textFill, 'font-family': font_family, 'font-size': dot_text_size
        }, 'R']);
      }
    }
  }

  return ['svg', { xmlns: w3.svg, width: svgW, height: svgH }, ...elems];
}

module.exports = renderScale;
