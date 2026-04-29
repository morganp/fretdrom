'use strict';

const w3 = require('./w3');
const buildGrid = require('./render-fretboard');

const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

function renderScale(source, skin) {
  const {
    scale_margin_top: MT, scale_margin_left: ML, scale_margin_right: MR, scale_margin_bottom: MB,
    dot_r: DR,
    dot_color, root_color, root_text_color, dot_text_color, fret_marker_color,
    font_family, title_size, subtitle_size, label_size, dot_text_size, title_color, label_color
  } = skin;

  const grid = source.grid;
  const startFret = source.start_fret || 1;
  const numFrets = source.num_frets || (grid[0] ? grid[0].length : 5);
  const tuning = source.tuning || 'EADGBE';
  const name = source.name || '';
  const numStrings = grid.length;

  const hasIntervalLabels = grid.some(row =>
    row.some(cell => cell && !['R', 'r', 'x', 'X', '.', '-'].includes(cell))
  );

  let subtitle;
  if (source.subtitle === false || source.subtitle === null) {
    subtitle = '';
  } else if (source.subtitle) {
    subtitle = source.subtitle;
  } else {
    subtitle = hasIntervalLabels ? 'Intervals' : '';
  }

  const { elems, xStr, ySlot, gridW, svgW, svgH } = buildGrid(
    { numStrings, numFrets, startFret, marginTop: MT, marginLeft: ML, marginRight: MR, marginBottom: MB },
    skin
  );

  if (name) {
    elems.push(['text', {
      x: svgW / 2, y: MT - 46,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: title_color, 'font-family': font_family,
      'font-size': title_size, 'font-weight': 'bold'
    }, name]);
  }

  if (subtitle) {
    elems.push(['text', {
      x: svgW / 2, y: MT - 30,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: label_color, 'font-family': font_family, 'font-size': subtitle_size
    }, subtitle]);
  }

  // tuning labels along the top, above the nut
  for (let s = 0; s < numStrings; s++) {
    elems.push(['text', {
      x: xStr(s), y: MT - 12,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, tuning[s] || '']);
  }

  // fret number labels at slot centres, down the left side
  for (let f = 1; f <= numFrets; f++) {
    elems.push(['text', {
      x: ML - DR - 6, y: ySlot(f),
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, String(startFret + f - 1)]);
  }

  // fret position markers at slot centres, on the right side
  for (let f = 1; f <= numFrets; f++) {
    if (FRET_MARKERS.has(startFret + f - 1)) {
      elems.push(['circle', {
        cx: ML + gridW + 14, cy: ySlot(f),
        r: 4, fill: fret_marker_color
      }]);
    }
  }

  // note dots in slots (grid[s][f] where f is 0-indexed -> slot f+1)
  for (let s = 0; s < numStrings; s++) {
    const row = grid[s] || [];
    for (let f = 0; f < numFrets; f++) {
      const cell = row[f];
      const isRoot = cell === 'R' || cell === 'r';
      const isInterval = !isRoot && cell && !['x', 'X', '.', '-'].includes(cell);
      const isNote = isRoot || cell === 'x' || cell === 'X' || isInterval;
      if (!isNote) continue;

      const cx = xStr(s);
      const cy = ySlot(f + 1);
      const fill = isRoot ? root_color : dot_color;
      elems.push(['circle', { cx, cy, r: DR, fill }]);

      const cellLabel = isRoot ? 'R' : (isInterval ? cell : null);
      if (cellLabel) {
        elems.push(['text', {
          x: cx, y: cy,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          fill: isRoot ? root_text_color : dot_text_color,
          'font-family': font_family, 'font-size': dot_text_size
        }, cellLabel]);
      }
    }
  }

  return ['svg', { xmlns: w3.svg, width: svgW, height: svgH }, ...elems];
}

module.exports = renderScale;
