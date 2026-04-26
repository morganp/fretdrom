'use strict';

const onml = require('onml');

function createElement(tree) {
  const svgStr = onml.s(tree);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgStr, 'image/svg+xml');
  return document.importNode(doc.documentElement, true);
}

module.exports = createElement;
