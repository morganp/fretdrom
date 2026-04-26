'use strict';

function buildGrid(opts, skin) {
  const { numStrings, numFrets, startFret, marginTop: MT, marginLeft: ML, marginRight: MR, marginBottom: MB } = opts;
  const { cell_w: CW, cell_h: CH, nut_width: NUT_W, bg_color, string_color, fret_color, nut_color, string_width, fret_width } = skin;

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

  const elems = [];

  elems.push(['rect', { x: 0, y: 0, width: svgW, height: svgH, fill: bg_color }]);

  if (startFret === 1) {
    elems.push(['rect', { x: ML, y: MT, width: gridW, height: NUT_W, fill: nut_color }]);
  } else {
    elems.push(['line', { x1: ML, y1: MT, x2: ML + gridW, y2: MT, stroke: fret_color, 'stroke-width': fret_width }]);
  }

  for (let f = 1; f <= numFrets; f++) {
    elems.push(['line', {
      x1: ML, y1: yWire(f), x2: ML + gridW, y2: yWire(f),
      stroke: fret_color, 'stroke-width': fret_width
    }]);
  }

  for (let s = 0; s < numStrings; s++) {
    elems.push(['line', {
      x1: xStr(s), y1: MT, x2: xStr(s), y2: MT + gridH,
      stroke: string_color, 'stroke-width': string_width
    }]);
  }

  return { elems, xStr, ySlot, yWire, gridW, gridH, svgW, svgH };
}

module.exports = buildGrid;
