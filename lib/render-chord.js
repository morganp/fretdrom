'use strict';

const w3 = require('./w3');
const buildGrid = require('./render-fretboard');

function isMuted(v) { return v === 'x' || v === 'X'; }
function isOpen(v) { return v === 0; }

function computeStartFret(frets) {
  const played = frets.filter(v => !isMuted(v) && !isOpen(v));
  if (!played.length) return 1;
  const min = Math.min(...played);
  return min > 5 ? min : 1;
}

function renderChord(source, skin) {
  const {
    chord_num_frets: NUM_FRETS,
    chord_margin_top: MT, chord_margin_left: ML, chord_margin_right: MR, chord_margin_bottom: MB,
    dot_r: DR,
    dot_color, dot_text_color, root_color, root_text_color,
    open_color, muted_color, barre_color,
    font_family, title_size, subtitle_size, label_size, dot_text_size,
    title_color, label_color
  } = skin;

  const frets = source.frets;
  const fingers = source.fingers || frets.map(() => null);
  const intervals = source.intervals || null;
  const rootStrings = source.root_strings || [];
  const barre = source.barre || null;
  const name = source.name || '';
  const numStrings = frets.length;

  // intervals take priority over fingers for dot labels
  const dotLabels = intervals || fingers;

  // auto subtitle: 'Intervals' when intervals are in use and no explicit subtitle
  let subtitle;
  if (source.subtitle === false || source.subtitle === null) {
    subtitle = '';
  } else if (source.subtitle) {
    subtitle = source.subtitle;
  } else {
    subtitle = intervals ? 'Intervals' : '';
  }
  const startFret = computeStartFret(frets);

  const { elems, xStr, ySlot, svgW, svgH } = buildGrid(
    { numStrings, numFrets: NUM_FRETS, startFret, marginTop: MT, marginLeft: ML, marginRight: MR, marginBottom: MB },
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

  if (startFret > 1) {
    elems.push(['text', {
      x: ML - DR - 6, y: ySlot(1),
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, String(startFret)]);
  }

  for (let i = 0; i < numStrings; i++) {
    const v = frets[i];
    const markerY = MT - 18;
    if (isMuted(v)) {
      elems.push(['text', {
        x: xStr(i), y: markerY,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: muted_color, 'font-family': font_family, 'font-size': label_size + 2
      }, '×']);
    } else if (isOpen(v)) {
      elems.push(['circle', {
        cx: xStr(i), cy: markerY,
        r: 8, fill: 'none', stroke: open_color, 'stroke-width': 1.5
      }]);
    }
  }

  if (barre) {
    const bx1 = xStr(barre.from_string - 1);
    const bx2 = xStr(barre.to_string - 1);
    const by = ySlot(barre.fret - startFret + 1);
    elems.push(['rect', {
      x: bx1, y: by - DR, width: bx2 - bx1, height: DR * 2,
      rx: DR, ry: DR, fill: barre_color
    }]);
  }

  for (let i = 0; i < numStrings; i++) {
    const v = frets[i];
    if (isMuted(v) || isOpen(v)) continue;
    const fretNum = Number(v);
    if (isNaN(fretNum) || fretNum <= 0) continue;
    const localFret = fretNum - startFret + 1;
    if (localFret < 1 || localFret > NUM_FRETS) continue;

    const cx = xStr(i);
    const cy = ySlot(localFret);
    const isRoot = rootStrings.includes(i + 1);

    elems.push(['circle', { cx, cy, r: DR, fill: isRoot ? root_color : dot_color }]);

    const dotLabel = dotLabels[i];
    if (dotLabel !== null && dotLabel !== undefined) {
      elems.push(['text', {
        x: cx, y: cy,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: isRoot ? root_text_color : dot_text_color,
        'font-family': font_family, 'font-size': dot_text_size
      }, String(dotLabel)]);
    }
  }

  return ['svg', { xmlns: w3.svg, width: svgW, height: svgH }, ...elems];
}

module.exports = renderChord;
