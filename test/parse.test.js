'use strict';

const { expect } = require('chai');
const parse = require('../lib/parse');

describe('parse', function() {
  it('throws if no type key', function() {
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
    const result = parse({ chord: { frets: [0, 1, 2, 3, 2, 1] } });
    expect(result.tuning).to.equal('EADGBE');
  });

  it('preserves provided tuning', function() {
    const result = parse({ chord: { frets: [0, 1, 2, 3, 2, 1], tuning: 'DADGBE' } });
    expect(result.tuning).to.equal('DADGBE');
  });

  describe('chord', function() {
    it('throws if frets missing', function() {
      expect(() => parse({ chord: {} })).to.throw(/frets/);
    });

    it('throws if frets empty', function() {
      expect(() => parse({ chord: { frets: [] } })).to.throw(/frets/);
    });

    it('expands compact frets string', function() {
      const result = parse({ chord: { frets: 'x32010' } });
      expect(result.frets).to.deep.equal(['x', 3, 2, 0, 1, 0]);
    });

    it('expands compact fingers string', function() {
      const result = parse({ chord: { frets: 'x32010', fingers: '-32-1-' } });
      expect(result.fingers).to.deep.equal([null, 3, 2, null, 1, null]);
    });

    it('defaults fingers to null array', function() {
      const result = parse({ chord: { frets: [0, 1, 2] } });
      expect(result.fingers).to.deep.equal([null, null, null]);
    });

    it('defaults root_strings to empty array', function() {
      const result = parse({ chord: { frets: [0, 1, 2] } });
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
      expect(() => parse({ scale: {} })).to.throw(/grid/);
    });

    it('defaults start_fret to 1', function() {
      const result = parse({ scale: { grid: [['R', '.']] } });
      expect(result.start_fret).to.equal(1);
    });

    it('defaults num_frets from grid row length', function() {
      const result = parse({ scale: { grid: [['R', '.', 'x', '.', 'R']] } });
      expect(result.num_frets).to.equal(5);
    });
  });

  describe('tab', function() {
    it('throws if tab array missing', function() {
      expect(() => parse({ tab: [] })).to.throw(/tab/);
    });

    it('parses wave strings into lanes', function() {
      const result = parse({ tab: [
        { name: 'e', wave: '03.' },
        { name: 'E', wave: '...' }
      ]});
      expect(result.lanes).to.have.length(2);
      expect(result.lanes[0].name).to.equal('e');
      expect(result.lanes[0].beats).to.deep.equal([0, 3, '-']);
    });

    it('maps hex chars to fret numbers above 9', function() {
      const result = parse({ tab: [{ name: 'e', wave: 'ac' }] });
      expect(result.lanes[0].beats[0]).to.equal(10);
      expect(result.lanes[0].beats[1]).to.equal(12);
    });

    it('parses intro-riff fixture correctly', function() {
      const json5 = require('json5');
      const fs = require('fs');
      const path = require('path');
      const raw = fs.readFileSync(path.join(__dirname, 'fixtures/intro-riff.json5'), 'utf8');
      const source = json5.parse(raw);
      const result = parse(source);
      expect(result.type).to.equal('tab');
      expect(result.lanes).to.have.length(6);
      expect(result.lanes[0].name).to.equal('e');
    });
  });
});
