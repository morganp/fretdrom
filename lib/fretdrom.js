'use strict';

const pkg = require('../package.json');
const processAll = require('./process-all');
const renderElement = require('./render-element');

window.FretDrom = {
  version: pkg.version,
  processAll,
  renderElement
};
