'use strict';

const renderAny = require('./render-any');
const createElement = require('./create-element');
const allSkins = require('./all-skins');

function renderElement(id, source, outputDiv) {
  while (outputDiv.firstChild) outputDiv.removeChild(outputDiv.firstChild);
  const tree = renderAny(id, source, allSkins);
  outputDiv.appendChild(createElement(tree));
}

module.exports = renderElement;
