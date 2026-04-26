'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const json5 = require('json5');
const { renderSVG, parse } = require('../lib');
const renderScale = require('../lib/render-scale');
const allSkins = require('../lib/all-skins');
const onml = require('onml');

function loadFixture(name) {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
  return json5.parse(raw);
}

describe('renderScale', function() {
  it('renders A Minor Pentatonic to SVG string', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.be.a('string');
    expect(svg).to.include('<svg');
  });

  it('SVG contains the scale name', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('A Minor Pentatonic');
  });

  it('SVG includes fret labels', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>5<');
    expect(svg).to.include('>6<');
  });

  it('root notes are rendered with root_color', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const skin = allSkins.default;
    const svg = onml.s(renderScale(parsed, skin));
    expect(svg).to.include(skin.root_color);
  });

  it('root notes have R label', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>R<');
  });

  it('returns onml tree with svg root', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const tree = renderScale(parsed, allSkins.default);
    expect(tree[0]).to.equal('svg');
    expect(tree[1]).to.have.property('xmlns');
    expect(tree[1]).to.have.property('width');
    expect(tree[1]).to.have.property('height');
  });

  it('SVG dimensions match skin constants', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const skin = allSkins.default;
    const tree = renderScale(parsed, skin);
    const numStrings = parsed.grid.length;
    const expectedW = skin.scale_margin_left + (numStrings - 1) * skin.cell_w + skin.scale_margin_right;
    expect(tree[1].width).to.equal(expectedW);
  });

  it('fret marker appears for fret 5', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const skin = allSkins.default;
    const svg = onml.s(renderScale(parsed, skin));
    expect(svg).to.include(skin.fret_marker_color);
  });

  it('tuning labels appear in SVG', function() {
    const source = loadFixture('a-minor-penta.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>E<');
  });
});
