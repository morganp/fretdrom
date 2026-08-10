'use strict';

const { parseTabWave } = require('./parse-wave');

const KNOWN_TYPES = new Set(['chord', 'chords', 'scale', 'tab']);

function detectType(source) {
  if (Array.isArray(source.tab)) return 'tab';
  if (Array.isArray(source.chords)) return 'chords';
  if (source.chord !== undefined) return 'chord';
  if (source.scale !== undefined) return 'scale';
  if (source.type) return source.type;
  throw new Error('Cannot determine diagram type: use { tab: [...] }, { chord: {...} }, { chords: [...] }, or { scale: {...} }');
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

function parseTuning(tuning) {
  if (!tuning) return 'EADGBE';
  // Strip octave numbers: "E2 A2 D3 G3 B3 E4" -> "EADGBE"
  if (/\d/.test(tuning) || tuning.includes(' ')) {
    return tuning.split(/\s+/).map(t => t.replace(/\d+/g, '')).join('');
  }
  return tuning;
}

function parseIntervals(intervals) {
  if (!intervals) return null;
  if (Array.isArray(intervals)) return intervals.map(v => (v === '-' || v == null) ? null : String(v));
  return null;
}

// Normalises the fret/finger/interval fields of one chord in place.
function normalizeChord(data) {
  if (!data.frets) throw new Error('Chord requires frets');
  data.frets = parseFrets(data.frets);
  if (!data.frets.length) throw new Error('Chord frets must not be empty');
  data.fingers = parseFingers(data.fingers, data.frets.length);
  if (data.intervals !== undefined) data.intervals = parseIntervals(data.intervals);
  if (!data.root_strings) data.root_strings = [];
  return data;
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

  // Carry a top-level config through the shorthand forms ({ chord: {...} } etc)
  // so per-diagram settings like skin or low_string survive normalisation.
  if (data.config === undefined && source.config !== undefined) data.config = source.config;

  data.tuning = parseTuning(data.tuning);

  if (type === 'chord') {
    normalizeChord(data);
  }

  if (type === 'chords') {
    if (!Array.isArray(data.chords) || !data.chords.length) {
      throw new Error('Chords requires a non-empty chords array');
    }
    // Each entry is a chord in its own right; the row's tuning is the default
    // for entries that do not set their own.
    const rowTuning = data.tuning;
    data.chords = data.chords.map(entry => {
      if (!entry || typeof entry !== 'object') {
        throw new Error('Each chords entry must be an object');
      }
      const item = Object.assign({ tuning: rowTuning }, entry, { type: 'chord' });
      item.tuning = parseTuning(item.tuning);
      return normalizeChord(item);
    });
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
