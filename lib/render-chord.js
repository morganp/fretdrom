'use strict';

const w3 = require('./w3');

function isMuted(v) {
  return v === 'x' || v === 'X';
}

function isOpen(v) {
  return v === 0;
}

function computeStartFret(frets) {
  const played = frets.filter(v => !isMuted(v) && !isOpen(v));
  if (played.length === 0) return 1;
  const min = Math.min(...played);
  return min > 5 ? min : 1;
}

function renderChord(source, skin) {
  const {
    chord_cell_w: CW, chord_cell_h: CH, chord_dot_r: DR, nut_width: NUT_W,
    chord_margin_top: MT, chord_margin_left: ML, chord_margin_right: MR, chord_margin_bottom: MB,
    chord_num_frets: NUM_FRETS,
    bg_color, string_color, fret_color, nut_color, dot_color, dot_text_color,
    root_color, root_text_color, open_color, muted_color, barre_color,
    font_family, title_size, label_size, dot_text_size, string_width, fret_width
  } = skin;

  const frets = source.frets;
  const fingers = source.fingers || frets.map(() => null);
  const rootStrings = source.root_strings || [];
  const barre = source.barre || null;
  const name = source.name || '';

  const numStrings = frets.length;
  const startFret = computeStartFret(frets);
  const gridW = (numStrings - 1) * CW;
  const gridH = NUM_FRETS * CH;

  const svgW = ML + gridW + MR;
  const svgH = MT + gridH + MB;

  const yNut = MT;

  function xStr(i) { return ML + i * CW; }
  function yFret(f) { return yNut + (f - 0.5) * CH; }

  const elems = [];

  elems.push(['rect', { x: 0, y: 0, width: svgW, height: svgH, fill: bg_color }]);

  if (name) {
    elems.push(['text', {
      x: svgW / 2, y: MT - 28,
      'text-anchor': 'middle', 'dominant-baseline': 'auto',
      fill: skin.title_color, 'font-family': font_family,
      'font-size': title_size, 'font-weight': 'bold'
    }, name]);
  }

  if (startFret === 1) {
    elems.push(['rect', {
      x: ML, y: yNut,
      width: gridW, height: NUT_W,
      fill: nut_color
    }]);
  } else {
    elems.push(['line', {
      x1: ML, y1: yNut, x2: ML + gridW, y2: yNut,
      stroke: fret_color, 'stroke-width': fret_width
    }]);
    elems.push(['text', {
      x: ML - 8, y: yNut + CH / 2,
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: skin.label_color, 'font-family': font_family, 'font-size': label_size
    }, String(startFret)]);
  }

  for (let f = 1; f <= NUM_FRETS; f++) {
    elems.push(['line', {
      x1: ML, y1: yNut + f * CH, x2: ML + gridW, y2: yNut + f * CH,
      stroke: fret_color, 'stroke-width': fret_width
    }]);
  }

  for (let i = 0; i < numStrings; i++) {
    elems.push(['line', {
      x1: xStr(i), y1: yNut, x2: xStr(i), y2: yNut + gridH,
      stroke: string_color, 'stroke-width': string_width
    }]);
  }

  if (barre) {
    const bx1 = xStr(barre.from_string - 1);
    const bx2 = xStr(barre.to_string - 1);
    const by = yFret(barre.fret - startFret + 1);
    elems.push(['rect', {
      x: bx1, y: by - DR,
      width: bx2 - bx1, height: DR * 2,
      rx: DR, ry: DR,
      fill: barre_color
    }]);
  }

  for (let i = 0; i < numStrings; i++) {
    const v = frets[i];
    const markerY = yNut - 18;
    if (isMuted(v)) {
      elems.push(['text', {
        x: xStr(i), y: markerY,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: muted_color, 'font-family': font_family, 'font-size': label_size + 2
      }, '×']);
    } else if (isOpen(v)) {
      elems.push(['circle', {
        cx: xStr(i), cy: markerY,
        r: 8,
        fill: 'none', stroke: open_color, 'stroke-width': 1.5
      }]);
    }
  }

  for (let i = 0; i < numStrings; i++) {
    const v = frets[i];
    if (isMuted(v) || isOpen(v)) continue;
    const fretNum = Number(v);
    if (isNaN(fretNum) || fretNum <= 0) continue;

    const localFret = fretNum - startFret + 1;
    if (localFret < 1 || localFret > NUM_FRETS) continue;

    const cx = xStr(i);
    const cy = yFret(localFret);
    const isRoot = rootStrings.includes(i + 1);
    const fillColor = isRoot ? root_color : dot_color;
    const textColor = isRoot ? root_text_color : dot_text_color;

    elems.push(['circle', { cx, cy, r: DR, fill: fillColor }]);

    const finger = fingers[i];
    if (finger !== null && finger !== undefined) {
      elems.push(['text', {
        x: cx, y: cy,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: textColor, 'font-family': font_family, 'font-size': dot_text_size
      }, String(finger)]);
    }
  }

  return ['svg', { xmlns: w3.svg, width: svgW, height: svgH }, ...elems];
}

module.exports = renderChord;
