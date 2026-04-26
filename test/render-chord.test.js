'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const json5 = require('json5');
const { renderSVG, parse } = require('../lib');
const renderChord = require('../lib/render-chord');
const allSkins = require('../lib/all-skins');
const onml = require('onml');

function loadFixture(name) {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
  return json5.parse(raw);
}

describe('renderChord', function() {
  it('renders C Major to SVG string', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.be.a('string');
    expect(svg).to.include('<svg');
    expect(svg).to.include('</svg>');
  });

  it('SVG contains xmlns attribute', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('xmlns');
    expect(svg).to.include('http://www.w3.org/2000/svg');
  });

  it('SVG contains the chord name', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('C Major');
  });

  it('SVG contains circles for fretted notes', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('<circle');
  });

  it('renders muted string marker', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('\xd7');
  });

  it('renders open string circle', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('fill="none"');
  });

  it('returns onml tree with svg root', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const tree = renderChord(parsed, allSkins.default);
    expect(tree[0]).to.equal('svg');
    expect(tree[1]).to.have.property('xmlns');
    expect(tree[1]).to.have.property('width');
    expect(tree[1]).to.have.property('height');
  });

  it('SVG dimensions match skin constants for 6-string', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const skin = allSkins.default;
    const tree = renderChord(parsed, skin);
    const numStrings = parsed.frets.length;
    const expectedW = skin.chord_margin_left + (numStrings - 1) * skin.cell_w + skin.chord_margin_right;
    const expectedH = skin.chord_margin_top + skin.chord_num_frets * skin.cell_h + skin.chord_margin_bottom;
    expect(tree[1].width).to.equal(expectedW);
    expect(tree[1].height).to.equal(expectedH);
  });

  it('renders barre chord', function() {
    const source = {
      type: 'chord',
      name: 'F Major',
      tuning: 'EADGBE',
      frets: [1, 1, 2, 3, 3, 1],
      fingers: [1, 1, 2, 3, 4, 1],
      barre: { fret: 1, from_string: 1, to_string: 6 }
    };
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('<rect');
    expect(svg).to.include('F Major');
  });

  it('handles high-position chord with start_fret label', function() {
    const source = {
      type: 'chord',
      name: 'B Major',
      tuning: 'EADGBE',
      frets: ['x', 2, 4, 4, 4, 2]
    };
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('2');
  });

  it('renders root note dots in root_color', function() {
    const source = {
      type: 'chord',
      name: 'G Major',
      tuning: 'EADGBE',
      frets: [3, 2, 0, 0, 0, 3],
      root_strings: [1, 6]
    };
    const parsed = parse(source);
    const skin = allSkins.default;
    const svg = onml.s(renderChord(parsed, skin));
    expect(svg).to.include(skin.root_color);
  });

  it('finger numbers appear in dot text', function() {
    const source = loadFixture('c-major.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>1<');
    expect(svg).to.include('>2<');
    expect(svg).to.include('>3<');
  });
});
