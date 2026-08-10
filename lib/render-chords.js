'use strict';

const w3 = require('./w3');
const renderChord = require('./render-chord');
const resolveSkin = require('./resolve-skin');

// Renders several chord diagrams side by side in a single SVG. Each chord is
// drawn by renderChord and dropped into a nested <svg> viewport, so the chord
// renderer keeps its own local coordinates and needs no offset awareness.
function renderChords(source, skin, skins, defaultSkin) {
  const gap = skin.chord_row_gap != null ? skin.chord_row_gap : 16;

  const panels = source.chords.map(item => {
    const itemSkin = item.config ? resolveSkin(item.config, skins, defaultSkin, skin) : skin;
    return renderChord(item, itemSkin);
  });

  const elems = [];
  let x = 0;
  let height = 0;

  panels.forEach((panel, i) => {
    const { width: w, height: h } = panel[1];
    if (i > 0) x += gap;
    elems.push(['svg', { x, y: 0, width: w, height: h }, ...panel.slice(2)]);
    x += w;
    if (h > height) height = h;
  });

  const width = x;

  return ['svg', { xmlns: w3.svg, width, height },
    ['rect', { x: 0, y: 0, width, height, fill: skin.bg_color }],
    ...elems
  ];
}

module.exports = renderChords;
