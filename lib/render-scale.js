'use strict';

const w3 = require('./w3');

const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

function renderScale(source, skin) {
  const {
    scale_cell_w: CW, scale_cell_h: CH, scale_dot_r: DR,
    scale_margin_top: MT, scale_margin_left: ML, scale_margin_right: MR, scale_margin_bottom: MB,
    bg_color, string_color, fret_color, dot_color, root_color, root_text_color, dot_text_color,
    fret_marker_color, font_family, title_size, label_size, dot_text_size,
    string_width, fret_width, title_color, label_color
  } = skin;

  const grid = source.grid;
  const startFret = source.start_fret || 1;
  const numFrets = source.num_frets || (grid[0] ? grid[0].length : 5);
  const tuning = source.tuning || 'EADGBE';
  const name = source.name || '';

  const numStrings = grid.length;
  const gridW = (numFrets - 1) * CW;
  const gridH = (numStrings - 1) * CH;

  const svgW = ML + gridW + MR;
  const svgH = MT + gridH + MB + 28;

  function xFret(f) { return ML + f * CW; }
  function yStr(s) { return MT + s * CH; }

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

  for (let s = 0; s < numStrings; s++) {
    elems.push(['line', {
      x1: ML, y1: yStr(s), x2: ML + gridW, y2: yStr(s),
      stroke: string_color, 'stroke-width': string_width
    }]);
  }

  for (let f = 0; f < numFrets; f++) {
    elems.push(['line', {
      x1: xFret(f), y1: MT, x2: xFret(f), y2: MT + gridH,
      stroke: fret_color, 'stroke-width': fret_width
    }]);
  }

  for (let f = 0; f < numFrets; f++) {
    elems.push(['text', {
      x: xFret(f), y: MT - 12,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, String(startFret + f)]);
  }

  for (let s = 0; s < numStrings; s++) {
    const tuningChar = tuning[s] || '';
    elems.push(['text', {
      x: ML - 10, y: yStr(s),
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, tuningChar]);
  }

  const markerY = MT + gridH + 14;
  for (let f = 0; f < numFrets; f++) {
    const absoluteFret = startFret + f;
    if (FRET_MARKERS.has(absoluteFret)) {
      elems.push(['circle', {
        cx: xFret(f), cy: markerY,
        r: 4,
        fill: fret_marker_color
      }]);
    }
  }

  for (let s = 0; s < numStrings; s++) {
    const row = grid[s] || [];
    for (let f = 0; f < numFrets; f++) {
      const cell = row[f];
      if (!isNote(cell)) continue;
      const cx = xFret(f);
      const cy = yStr(s);
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
