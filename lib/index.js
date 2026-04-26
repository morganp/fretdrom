'use strict';

const onml = require('onml');
const parse = require('./parse');
const renderAny = require('./render-any');
const allSkins = require('./all-skins');

module.exports = {
  parse,
  renderAny,
  renderSVG(source) {
    const parsed = parse(source);
    const tree = renderAny(0, parsed, allSkins);
    return onml.s(tree);
  }
};
