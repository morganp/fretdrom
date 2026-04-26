'use strict';

function parseTabChar(c) {
  if (c === 'x' || c === 'X') return 'x';
  if (c >= '0' && c <= '9') return parseInt(c, 10);
  if (c >= 'a' && c <= 'z') return c.charCodeAt(0) - 97 + 10;
  return '-';
}

function parseTabWave(str) {
  return str.split('').map(parseTabChar);
}

module.exports = { parseTabWave };
