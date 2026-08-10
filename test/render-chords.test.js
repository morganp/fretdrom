'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const json5 = require('json5');
const { renderSVG, parse, renderAny } = require('../lib');
const renderChord = require('../lib/render-chord');
const allSkins = require('../lib/all-skins');

function loadFixture(name) {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
  return json5.parse(raw);
}

describe('renderChords', function() {
  it('detects the chords type from a chords array', function() {
    const parsed = parse(loadFixture('chord-row.json5'));
    expect(parsed.type).to.equal('chords');
    expect(parsed.chords).to.have.lengthOf(3);
  });

  it('normalises each entry like a standalone chord', function() {
    const parsed = parse(loadFixture('chord-row.json5'));
    const am = parsed.chords[0];
    expect(am.type).to.equal('chord');
    expect(am.frets).to.deep.equal(['x', 0, 2, 2, 1, 0]);
    expect(am.fingers).to.deep.equal([null, null, 2, 3, 1, null]);
    expect(am.root_strings).to.deep.equal([]);
  });

  it('inherits the row tuning when an entry omits it', function() {
    const parsed = parse({
      tuning: 'DADGAD',
      chords: [{ name: 'Dsus4', frets: '000000' }, { name: 'Bass E', tuning: 'EADG', frets: '0221' }]
    });
    expect(parsed.chords[0].tuning).to.equal('DADGAD');
    expect(parsed.chords[1].tuning).to.equal('EADG');
  });

  it('renders one SVG containing every chord name', function() {
    const svg = renderSVG(parse(loadFixture('chord-row.json5')));
    expect(svg.match(/<svg/g)).to.have.lengthOf(4); // outer + one nested per chord
    expect(svg).to.include('A Minor');
    expect(svg).to.include('C Major');
    expect(svg).to.include('G Major');
  });

  it('widths sum with a gap between panels', function() {
    const parsed = parse(loadFixture('chord-row.json5'));
    const skin = allSkins.default;
    const tree = renderAny(0, parsed, allSkins);
    const panelW = renderChord(parsed.chords[0], skin)[1].width;
    const panelH = renderChord(parsed.chords[0], skin)[1].height;
    expect(tree[1].width).to.equal(panelW * 3 + skin.chord_row_gap * 2);
    expect(tree[1].height).to.equal(panelH);
  });

  it('offsets each nested viewport by width plus gap', function() {
    const parsed = parse(loadFixture('chord-row.json5'));
    const skin = allSkins.default;
    const tree = renderAny(0, parsed, allSkins);
    const panelW = renderChord(parsed.chords[0], skin)[1].width;
    // tree = ['svg', attrs, bgRect, panel0, panel1, panel2]
    const panels = tree.slice(3);
    expect(panels.map(p => p[1].x)).to.deep.equal([
      0,
      panelW + skin.chord_row_gap,
      (panelW + skin.chord_row_gap) * 2
    ]);
  });

  it('honours a per-entry skin override', function() {
    const parsed = parse({
      chords: [
        { name: 'Am', frets: 'x02210' },
        { name: 'C', frets: 'x32010', config: { skin: 'dark' } }
      ]
    });
    const tree = renderAny(0, parsed, allSkins, 'default');
    const darkBg = allSkins.dark.bg_color;
    const panels = tree.slice(3);
    expect(panels[0][2][1].fill).to.equal(allSkins.default.bg_color);
    expect(panels[1][2][1].fill).to.equal(darkBg);
  });

  it('applies a row-level skin to every entry', function() {
    const parsed = parse({
      config: { skin: 'dark' },
      chords: [{ name: 'Am', frets: 'x02210' }, { name: 'C', frets: 'x32010' }]
    });
    const tree = renderAny(0, parsed, allSkins, 'default');
    expect(tree[2][1].fill).to.equal(allSkins.dark.bg_color);
    tree.slice(3).forEach(panel => {
      expect(panel[2][1].fill).to.equal(allSkins.dark.bg_color);
    });
  });

  it('rejects an empty chords array', function() {
    expect(() => parse({ chords: [] })).to.throw(/non-empty/);
  });

  it('rejects a non-object entry', function() {
    expect(() => parse({ chords: ['x32010'] })).to.throw(/must be an object/);
  });

  it('rejects an entry without frets', function() {
    expect(() => parse({ chords: [{ name: 'Am' }] })).to.throw(/requires frets/);
  });
});
