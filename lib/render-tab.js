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

  const bars = source.bars;
  const tuning = source.tuning || 'EADGBE';
  const name = source.name || '';

  const numStrings = tuning.length;

  let totalBeats = 0;
  for (const bar of bars) {
    totalBeats += bar.beats ? bar.beats.length : 0;
  }

  const numBars = bars.length;
  const gridW = totalBeats * BW + numBars * 2;
  const gridH = (numStrings - 1) * SS;

  const svgW = ML + gridW + MR;
  const svgH = MT + gridH + MB;

  function yRow(row) { return MT + row * SS; }
  function yForString(strIdx) {
    return yRow(numStrings - 1 - strIdx);
  }

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

  for (let s = 0; s < numStrings; s++) {
    const y = yForString(s);
    elems.push(['line', {
      x1: ML, y1: y, x2: ML + gridW, y2: y,
      stroke: string_color, 'stroke-width': string_width
    }]);
  }

  const tabLetters = ['T', 'A', 'B'];
  for (let li = 0; li < tabLetters.length; li++) {
    const midString = Math.floor(numStrings / 2);
    const rowOffset = li - 1;
    const y = yRow(numStrings - 1 - (midString + rowOffset));
    elems.push(['text', {
      x: ML - 22, y: y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family,
      'font-size': label_size, 'font-weight': 'bold'
    }, tabLetters[li]]);
  }

  for (let s = 0; s < numStrings; s++) {
    const tuningChar = tuning[s] || '';
    elems.push(['text', {
      x: ML - 8, y: yForString(s),
      'text-anchor': 'end', 'dominant-baseline': 'middle',
      fill: label_color, 'font-family': font_family, 'font-size': label_size
    }, tuningChar]);
  }

  let beatAbs = 0;
  let barLineCount = 0;

  for (let b = 0; b < bars.length; b++) {
    const bar = bars[b];
    const barLineX = ML + beatAbs * BW + barLineCount * 2;

    elems.push(['line', {
      x1: barLineX, y1: yForString(0),
      x2: barLineX, y2: yForString(numStrings - 1),
      stroke: tab_line_color, 'stroke-width': bar_line_width
    }]);

    barLineCount++;

    const beats = bar.beats || [];
    for (let beat = 0; beat < beats.length; beat++) {
      const beatData = beats[beat];
      const strings = beatData.strings || [];
      const xBeat = ML + beatAbs * BW + barLineCount * 2 - 2 + BW / 2;

      for (let s = 0; s < numStrings; s++) {
        const val = strings[s];
        if (val === null || val === undefined) continue;
        const y = yForString(s);
        const isDash = val === '-';
        const label = (val === 'x' || val === 'X') ? 'x' : isDash ? '-' : String(val);

        if (!isDash) {
          elems.push(['rect', {
            x: xBeat - (tab_num_size * 0.45),
            y: y - SS * 0.4,
            width: tab_num_size * 0.9,
            height: SS * 0.8,
            fill: bg_color
          }]);
        }

        elems.push(['text', {
          x: xBeat, y: y,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          fill: tab_num_color, 'font-family': font_family, 'font-size': tab_num_size
        }, label]);
      }

      beatAbs++;
    }
  }

  const finalBarX = ML + beatAbs * BW + barLineCount * 2;
  elems.push(['line', {
    x1: finalBarX - 2, y1: yForString(0),
    x2: finalBarX - 2, y2: yForString(numStrings - 1),
    stroke: tab_line_color, 'stroke-width': bar_line_width
  }]);
  elems.push(['line', {
    x1: finalBarX + 2, y1: yForString(0),
    x2: finalBarX + 2, y2: yForString(numStrings - 1),
    stroke: tab_line_color, 'stroke-width': bar_line_width + 2
  }]);

  return ['svg', { xmlns: w3.svg, width: svgW, height: svgH }, ...elems];
}

module.exports = renderTab;
