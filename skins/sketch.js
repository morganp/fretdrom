'use strict';
const def  = require('./default').default;
const dark = require('./dark').dark;

module.exports = {
  sketch: Object.assign({}, def, {
    bg_color:        '#fdf8f0',
    string_color:    '#2a2318',
    fret_color:      '#5a4a3a',
    nut_color:       '#2a2318',
    dot_color:       '#2a2318',
    dot_text_color:  '#fdf8f0',
    root_color:      '#c0392b',
    root_text_color: '#fdf8f0',
    open_color:      '#2a2318',
    muted_color:     '#7a6a5a',
    barre_color:     '#2a2318',
    title_color:     '#2a2318',
    label_color:     '#5a4a3a',
    fret_marker_color: '#9a8a7a',
    sketch:          true,
    sketch_amplitude: 2.5
  }),
  'sketch-dark': Object.assign({}, dark, {
    bg_color: '#1a1a24',
    sketch:          true,
    sketch_amplitude: 2.5
  })
};
