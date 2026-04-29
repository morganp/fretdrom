'use strict';

const sk = require('./sketch');

function buildGrid(opts, skin) {
  const { numStrings, numFrets, startFret, marginTop: MT, marginLeft: ML, marginRight: MR, marginBottom: MB } = opts;
  const {
    cell_w: CW, cell_h: CH, nut_width: NUT_W,
    bg_color, string_color, fret_color, nut_color, string_width, fret_width,
    sketch_amplitude: AMP = 1.5
  } = skin;

  const gridW = (numStrings - 1) * CW;
  const gridH = numFrets * CH;
  const svgW = ML + gridW + MR;
  const svgH = MT + gridH + MB;

  // xStr: x centre of string s (0-indexed, 0 = lowest string = leftmost column)
  // ySlot: y centre of fret slot f (1-indexed, 1 = first slot below nut)
  // yWire: y of fret wire f (0 = nut/boundary, 1 = first wire below, ...)
  function xStr(s) { return ML + s * CW; }
  function ySlot(f) { return MT + (f - 0.5) * CH; }
  function yWire(f) { return MT + f * CH; }

  // Returns a wobbly path in sketch mode, a plain line otherwise
  function line(x1, y1, x2, y2, attrs) {
    if (skin.sketch) return sk.sketchLine(x1, y1, x2, y2, { ...attrs, 'stroke-linecap': 'round' }, AMP);
    return ['line', { x1, y1, x2, y2, ...attrs }];
  }

  const elems = [];

  elems.push(['rect', { x: 0, y: 0, width: svgW, height: svgH, fill: bg_color }]);

  if (startFret === 1) {
    elems.push(skin.sketch
      ? sk.sketchNut(ML, MT, gridW, skin)
      : ['rect', { x: ML, y: MT, width: gridW, height: NUT_W, fill: nut_color }]);
  } else {
    elems.push(line(ML, MT, ML + gridW, MT, { stroke: fret_color, 'stroke-width': fret_width }));
  }

  for (let f = 1; f <= numFrets; f++) {
    elems.push(line(ML, yWire(f), ML + gridW, yWire(f), { stroke: fret_color, 'stroke-width': fret_width }));
  }

  for (let s = 0; s < numStrings; s++) {
    let sw = string_width;
    const lowStr = skin.low_string;
    if (skin.string_width_low != null && lowStr !== false && numStrings > 1) {
      const peakIdx = (lowStr == null ? 1 : +lowStr) - 1;
      if (s === peakIdx) {
        sw = skin.string_width_low;
      } else if (s > peakIdx) {
        const range = numStrings - 1 - peakIdx;
        sw = +(skin.string_width_low + (string_width - skin.string_width_low) * (s - peakIdx) / range).toFixed(2);
      }
      // s < peakIdx: stays string_width (thinnest)
    }
    elems.push(line(xStr(s), MT, xStr(s), MT + gridH, { stroke: string_color, 'stroke-width': sw }));
  }

  return { elems, xStr, ySlot, yWire, gridW, gridH, svgW, svgH };
}

module.exports = buildGrid;
