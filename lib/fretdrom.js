'use strict';

const pkg = require('../package.json');
const onml = require('onml');
const processAll = require('./process-all');
const renderElement = require('./render-element');
const parse = require('./parse');
const renderAny = require('./render-any');
const allSkins = require('./all-skins');

function renderSVG(input) {
  const source = parse(input);
  const tree = renderAny(null, source, allSkins);
  return onml.s(tree);
}

module.exports = {
  version: pkg.version,
  processAll,
  renderElement,
  renderSVG
};
