'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const json5 = require('json5');
const { renderSVG, parse } = require('../lib');
const renderTab = require('../lib/render-tab');
const allSkins = require('../lib/all-skins');
const onml = require('onml');

function loadFixture(name) {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
  return json5.parse(raw);
}

describe('renderTab', function() {
  it('renders Intro Riff to SVG string', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.be.a('string');
    expect(svg).to.include('<svg');
  });

  it('SVG contains the tab name', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('Intro Riff');
  });

  it('SVG contains fret numbers from wave strings', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>2<');
    expect(svg).to.include('>3<');
    expect(svg).to.include('>0<');
  });

  it('returns onml tree with svg root', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const tree = renderTab(parsed, allSkins.default);
    expect(tree[0]).to.equal('svg');
    expect(tree[1]).to.have.property('xmlns');
    expect(tree[1]).to.have.property('width');
    expect(tree[1]).to.have.property('height');
  });

  it('SVG has horizontal string lines', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('<line');
  });

  it('string name labels appear in SVG', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>e<');
    expect(svg).to.include('>E<');
  });

  it('bar lines are rendered when config.bar is set', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const skin = allSkins.default;
    const tree = renderTab(parsed, skin);
    const svg = onml.s(tree);
    const lineCount = (svg.match(/<line/g) || []).length;
    expect(lineCount).to.be.above(6);
  });

  it('handles muted strings (x value in wave)', function() {
    const source = {
      tab: [
        { name: 'e', wave: '......' },
        { name: 'B', wave: '......' },
        { name: 'G', wave: '......' },
        { name: 'D', wave: '......' },
        { name: 'A', wave: '......' },
        { name: 'E', wave: 'x.....' }
      ]
    };
    const parsed = parse(source);
    const svg = renderSVG(parsed);
    expect(svg).to.include('>x<');
  });

  it('SVG width is based on beat count', function() {
    const source = loadFixture('intro-riff.json5');
    const parsed = parse(source);
    const skin = allSkins.default;
    const tree = renderTab(parsed, skin);
    const numBeats = Math.max(...parsed.lanes.map(l => l.beats.length));
    const expectedW = skin.tab_margin_left + numBeats * skin.tab_beat_w + skin.tab_margin_right;
    expect(tree[1].width).to.equal(expectedW);
  });
});
