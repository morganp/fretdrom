'use strict';

const w3 = require('./w3');

function renderTab(source, skin) {
  const {
    tab_string_spacing: SS, tab_beat_w: BW,
    tab_margin_left: ML, tab_margin_right: MR, tab_margin_top: MT, tab_margin_bottom: MB,
    bg_color, string_color, tab_line_color, tab_num_color,
    font_family, title_size, label_size, tab_num_size,
    string_width, bar_line_width, title_color, label_color
  } = skin;

  const lanes = source.lanes;
  const name = source.name || '';
  const beatsPerBar = source.config && source.config.bar ? source.config.bar : 0;

  const numStrings = lanes.length;
  const numBeats = Math.max(...lanes.map(l => l.beats.length), 1);

  const gridW = numBeats * BW;
  const gridH = (numStrings - 1) * SS;

  const svgW = ML + gridW + MR;
  const svgH = MT + gridH + MB;

  // lane 0 is the top row (highest string in standard tab notation)
  function yLane(i) { return MT + i * SS; }
  function xBeat(b) { return ML + b * BW + BW / 2; }

  const elems = [];

  elems.push(['rect', { x: 0, y: 0, width: svgW, height: svgH, fill: bg_color }]);

  if (name) {
    elems.push(['text', {
      x: ML, y: MT - 12,
      'text-anchor': 'start', 'dominant-baseline': 'auto',
      fill: title_color, 'font-family': font_family,
      'font-size': title_size, 'font-weight': 'bold'
    }, name]);
  }

  // horizontal string lines
  for (let i = 0; i < numStrings; i++) {
    elems.push(['line', {
      x1: ML, y1: yLane(i), x2: ML + gridW, y2: yLane(i),
      stroke: string_color, 'stroke-width': string_width
    }]);
  }

  // TAB label centred vertically on the staff
  const tabLetters = ['T', 'A', 'B'];
  const midRow = Math.floor((numStrings - 1) / 2);
  for (let li = 0; li < tabLetters.length; li++) {
    const row = midRow - 1 + li;
    if (row >= 0 && row < numStrings) {
      elems.push(['text', {
        x: ML - 22, y: yLane(row),
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: label_color, 'font-family': font_family,
        'font-size': label_size, 'font-weight': 'bold'
      }, tabLetters[li]]);
    }
  }

  // string name labels
  for (let i = 0; i < numStrings; i++) {
    elems.push(['text', {
      x: ML - 8, y: yLane(i),
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, lanes[i].name]);
  }

  // opening bar line
  elems.push(['line', {
    x1: ML, y1: yLane(0), x2: ML, y2: yLane(numStrings - 1),
    stroke: tab_line_color, 'stroke-width': bar_line_width
  }]);

  // internal bar lines when config.bar is set
  if (beatsPerBar > 0) {
    for (let barNum = 1; barNum * beatsPerBar < numBeats; barNum++) {
      const x = ML + barNum * beatsPerBar * BW;
      elems.push(['line', {
        x1: x, y1: yLane(0), x2: x, y2: yLane(numStrings - 1),
        stroke: tab_line_color, 'stroke-width': bar_line_width
      }]);
    }
  }

  // note values per lane
  for (let i = 0; i < numStrings; i++) {
    const beats = lanes[i].beats;
    for (let b = 0; b < beats.length; b++) {
      const val = beats[b];
      if (val === null || val === undefined) continue;
      const x = xBeat(b);
      const y = yLane(i);
      const isDash = val === '-';
      const label = val === 'x' ? 'x' : isDash ? '-' : String(val);

      if (!isDash) {
        elems.push(['rect', {
          x: x - tab_num_size * 0.45,
          y: y - SS * 0.4,
          width: tab_num_size * 0.9,
          height: SS * 0.8,
          fill: bg_color
        }]);
      }

      elems.push(['text', {
        x, y,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: tab_num_color, 'font-family': font_family, 'font-size': tab_num_size
      }, label]);
    }
  }

  // closing double bar line
  const finalX = ML + gridW;
  elems.push(['line', {
    x1: finalX - 2, y1: yLane(0), x2: finalX - 2, y2: yLane(numStrings - 1),
    stroke: tab_line_color, 'stroke-width': bar_line_width
  }]);
  elems.push(['line', {
    x1: finalX + 2, y1: yLane(0), x2: finalX + 2, y2: yLane(numStrings - 1),
    stroke: tab_line_color, 'stroke-width': bar_line_width + 2
  }]);

  return ['svg', { xmlns: w3.svg, width: svgW, height: svgH }, ...elems];
}

module.exports = renderTab;
