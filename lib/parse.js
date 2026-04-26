'use strict';

const KNOWN_TYPES = ['chord', 'scale', 'tab'];

function parse(source) {
  if (!source || typeof source !== 'object') {
    throw new Error('Input must be an object');
  }
  if (!source.type) {
    throw new Error('Input missing required field: type');
  }
  if (!KNOWN_TYPES.includes(source.type)) {
    throw new Error('Unknown type: ' + source.type);
  }

  const result = Object.assign({}, source);

  if (!result.tuning) {
    result.tuning = 'EADGBE';
  }

  if (result.type === 'chord') {
    if (!Array.isArray(result.frets) || result.frets.length === 0) {
      throw new Error('Chord requires a non-empty frets array');
    }
    if (!result.fingers) {
      result.fingers = result.frets.map(() => null);
    }
    if (!result.root_strings) {
      result.root_strings = [];
    }
  }

  if (result.type === 'scale') {
    if (!Array.isArray(result.grid) || result.grid.length === 0) {
      throw new Error('Scale requires a non-empty grid array');
    }
    if (typeof result.start_fret !== 'number') {
      result.start_fret = 1;
    }
    if (typeof result.num_frets !== 'number') {
      result.num_frets = result.grid[0] ? result.grid[0].length : 5;
    }
  }

  if (result.type === 'tab') {
    if (!Array.isArray(result.bars) || result.bars.length === 0) {
      throw new Error('Tab requires a non-empty bars array');
    }
  }

  return result;
}

module.exports = parse;
