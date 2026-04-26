'use strict';

const { expect } = require('chai');
const parse = require('../lib/parse');

describe('parse', function() {
  it('throws if no type field', function() {
    expect(() => parse({ frets: [0, 1, 2] })).to.throw(/type/);
  });

  it('throws on unknown type', function() {
    expect(() => parse({ type: 'unknown' })).to.throw(/Unknown type/);
  });

  it('throws if input is not an object', function() {
    expect(() => parse('hello')).to.throw();
    expect(() => parse(null)).to.throw();
  });

  it('defaults tuning to EADGBE', function() {
    const result = parse({ type: 'chord', frets: [0, 1, 2, 3, 2, 1] });
    expect(result.tuning).to.equal('EADGBE');
  });

  it('preserves provided tuning', function() {
    const result = parse({ type: 'chord', frets: [0, 1, 2, 3, 2, 1], tuning: 'DADGBE' });
    expect(result.tuning).to.equal('DADGBE');
  });

  describe('chord', function() {
    it('throws if frets missing', function() {
      expect(() => parse({ type: 'chord' })).to.throw(/frets/);
    });

    it('throws if frets empty', function() {
      expect(() => parse({ type: 'chord', frets: [] })).to.throw(/frets/);
    });

    it('defaults fingers to null array', function() {
      const result = parse({ type: 'chord', frets: [0, 1, 2] });
      expect(result.fingers).to.deep.equal([null, null, null]);
    });

    it('defaults root_strings to empty array', function() {
      const result = parse({ type: 'chord', frets: [0, 1, 2] });
      expect(result.root_strings).to.deep.equal([]);
    });

    it('parses c-major fixture correctly', function() {
      const json5 = require('json5');
      const fs = require('fs');
      const path = require('path');
      const raw = fs.readFileSync(path.join(__dirname, 'fixtures/c-major.json5'), 'utf8');
      const source = json5.parse(raw);
      const result = parse(source);
      expect(result.type).to.equal('chord');
      expect(result.name).to.equal('C Major');
      expect(result.frets).to.deep.equal(['x', 3, 2, 0, 1, 0]);
    });
  });

  describe('scale', function() {
    it('throws if grid missing', function() {
      expect(() => parse({ type: 'scale' })).to.throw(/grid/);
    });

    it('defaults start_fret to 1', function() {
      const result = parse({ type: 'scale', grid: [['R', '.']] });
      expect(result.start_fret).to.equal(1);
    });

    it('defaults num_frets from grid row length', function() {
      const result = parse({ type: 'scale', grid: [['R', '.', 'x', '.', 'R']] });
      expect(result.num_frets).to.equal(5);
    });
  });

  describe('tab', function() {
    it('throws if bars missing', function() {
      expect(() => parse({ type: 'tab' })).to.throw(/bars/);
    });

    it('throws if bars empty', function() {
      expect(() => parse({ type: 'tab', bars: [] })).to.throw(/bars/);
    });

    it('parses intro-riff fixture correctly', function() {
      const json5 = require('json5');
      const fs = require('fs');
      const path = require('path');
      const raw = fs.readFileSync(path.join(__dirname, 'fixtures/intro-riff.json5'), 'utf8');
      const source = json5.parse(raw);
      const result = parse(source);
      expect(result.type).to.equal('tab');
      expect(result.bars).to.have.length(2);
    });
  });
});
