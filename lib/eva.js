'use strict';

const json5 = require('json5');

function eva(id) {
  const el = document.getElementById(id);
  return json5.parse(el.innerHTML.trim());
}

module.exports = eva;
