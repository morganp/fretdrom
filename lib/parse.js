'use strict';

const { parseTabWave } = require('./parse-wave');

const KNOWN_TYPES = new Set(['chord', 'scale', 'tab']);

function detectType(source) {
  if (Array.isArray(source.tab)) return 'tab';
  if (source.chord !== undefined) return 'chord';
  if (source.scale !== undefined) return 'scale';
  if (source.type) return source.type;
  throw new Error('Cannot determine diagram type: use { tab: [...] }, { chord: {...} }, or { scale: {...} }');
}

function parseFrets(frets) {
  if (Array.isArray(frets)) return frets;
  return String(frets).split('').map(c => {
    if (c === 'x' || c === 'X') return 'x';
    if (c >= '0' && c <= '9') return parseInt(c, 10);
    if (c >= 'a' && c <= 'z') return c.charCodeAt(0) - 97 + 10;
    return 'x';
  });
}

function parseFingers(fingers, len) {
  if (!fingers) return Array(len).fill(null);
  if (Array.isArray(fingers)) return fingers;
  return String(fingers).split('').map(c => (c === '-' ? null : parseInt(c, 10) || null));
}

function parseIntervals(intervals) {
  if (!intervals) return null;
  if (Array.isArray(intervals)) return intervals.map(v => (v === '-' || v == null) ? null : String(v));
  return null;
}

function parse(source) {
  if (!source || typeof source !== 'object') throw new Error('Input must be an object');

  const type = detectType(source);
  if (!KNOWN_TYPES.has(type)) throw new Error('Unknown type: ' + type);

  let data;
  if (type === 'chord' && source.chord !== undefined) {
    data = Object.assign({ type: 'chord' }, source.chord);
  } else if (type === 'scale' && source.scale !== undefined) {
    data = Object.assign({ type: 'scale' }, source.scale);
  } else {
    data = Object.assign({}, source, { type });
  }

  if (!data.tuning) data.tuning = 'EADGBE';

  if (type === 'chord') {
    if (!data.frets) throw new Error('Chord requires frets');
    data.frets = parseFrets(data.frets);
    if (!data.frets.length) throw new Error('Chord frets must not be empty');
    data.fingers = parseFingers(data.fingers, data.frets.length);
    if (data.intervals !== undefined) data.intervals = parseIntervals(data.intervals);
    if (!data.root_strings) data.root_strings = [];
  }

  if (type === 'scale') {
    if (!Array.isArray(data.grid) || !data.grid.length) {
      throw new Error('Scale requires a non-empty grid array');
    }
    if (typeof data.start_fret !== 'number') data.start_fret = 1;
    if (typeof data.num_frets !== 'number') data.num_frets = data.grid[0] ? data.grid[0].length : 5;
  }

  if (type === 'tab') {
    if (Array.isArray(data.tab)) {
      if (!data.tab.length) throw new Error('Tab requires a non-empty tab array');
      data.lanes = data.tab.map(lane => ({
        name: lane.name || '',
        beats: parseTabWave(lane.wave || '')
      }));
    } else if (!Array.isArray(data.bars) || !data.bars.length) {
      throw new Error('Tab requires a non-empty tab array');
    }
  }

  return data;
}

module.exports = parse;
