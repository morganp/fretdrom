'use strict';

const json5 = require('json5');
const parse = require('./parse');
const renderAny = require('./render-any');
const createElement = require('./create-element');
const allSkins = require('./all-skins');

// source is the raw document, as an object or as JSON5 text.
function renderElement(id, source, outputDiv) {
  const raw = typeof source === 'string' ? json5.parse(source) : source;
  const tree = renderAny(id, parse(raw), allSkins);
  while (outputDiv.firstChild) outputDiv.removeChild(outputDiv.firstChild);
  outputDiv.appendChild(createElement(tree));
}

module.exports = renderElement;
