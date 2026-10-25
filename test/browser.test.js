'use strict';

const { expect } = require('chai');
const processAll = require('../lib/process-all');
const renderElement = require('../lib/render-element');

// A minimal fake DOM: just enough of document, nodes and DOMParser for the
// browser path (process-all, render-element, eva, create-element).
class FakeNode {
  constructor(tagName) {
    this.tagName = tagName;
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
  }
  get firstChild() { return this.children[0] || null; }
  getAttribute(name) { return this.attrs[name] === undefined ? null : this.attrs[name]; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  removeChild(node) {
    this.children.splice(this.children.indexOf(node), 1);
    node.parentNode = null;
    return node;
  }
  insertBefore(node, ref) {
    node.parentNode = this;
    this.children.splice(this.children.indexOf(ref), 0, node);
    return node;
  }
  walk(fn) { fn(this); this.children.forEach(c => c.walk(fn)); }
}

function makeDocument() {
  const body = new FakeNode('body');
  const all = (pred) => {
    const found = [];
    body.walk(n => { if (pred(n)) found.push(n); });
    return found;
  };
  return {
    body,
    createElement: (tag) => new FakeNode(tag),
    getElementById: (id) => all(n => n.id === id)[0] || null,
    querySelectorAll: (sel) => {
      expect(sel).to.equal('script[type="fretdrom"]');
      return all(n => n.tagName === 'script' && n.attrs.type === 'fretdrom');
    },
    // DOMParser result nodes are plain objects holding the SVG text.
    importNode: (node) => Object.assign(new FakeNode('svg'), { svg: node.svg })
  };
}

function addScript(doc, source) {
  const el = new FakeNode('script');
  el.attrs.type = 'fretdrom';
  el.innerHTML = source;
  doc.body.appendChild(el);
  return el;
}

describe('browser path', function() {
  let doc;
  let errors;
  let originalError;

  beforeEach(function() {
    doc = makeDocument();
    global.document = doc;
    global.DOMParser = class {
      parseFromString(svg) { return { documentElement: { svg } }; }
    };
    errors = [];
    originalError = console.error;
    console.error = (...args) => errors.push(args);
  });

  afterEach(function() {
    console.error = originalError;
    delete global.document;
    delete global.DOMParser;
  });

  function displays() {
    return doc.body.children.filter(n => n.tagName === 'div');
  }

  it('processAll renders a chord, a scale, a tab and a chords row', function() {
    addScript(doc, '{ chord: { name: "C Major", frets: "x32010", fingers: "-32-1-" } }');
    addScript(doc, '{ scale: { name: "Penta", start_fret: 5, grid: [["R", "x"], ["x", "."]] } }');
    addScript(doc, '{ tab: [{ name: "e", wave: "03.0" }, { name: "B", wave: "2.2." }] }');
    addScript(doc, '{ chords: [{ name: "Am", frets: "x02210" }, { name: "C", frets: "x32010" }] }');
    processAll();
    const divs = displays();
    expect(divs).to.have.length(4);
    divs.forEach((div, i) => {
      expect(div.id).to.equal('FretDrom_Display_' + i);
      expect(div.children).to.have.length(1);
      expect(div.children[0].svg).to.match(/^<svg /);
    });
    expect(divs[0].children[0].svg).to.contain('C Major');
    expect(divs[1].children[0].svg).to.contain('Penta');
    expect(divs[3].children[0].svg).to.contain('Am');
    expect(errors).to.have.length(0);
    expect(doc.getElementById('FretDrom_Input_2').tagName).to.equal('script');
  });

  it('processAll shows an error in place and keeps going', function() {
    addScript(doc, '{ chord: { name: "No frets" } }');
    addScript(doc, '{ chord: { name: "C Major", frets: "x32010" } }');
    addScript(doc, '{ chord: { frets: ');
    addScript(doc, '{ tab: [{ name: "e", wave: "03" }] }');
    processAll();
    const divs = displays();
    expect(divs).to.have.length(4);
    expect(divs[0].children[0].tagName).to.equal('pre');
    expect(divs[0].children[0].className).to.equal('fretdrom-error');
    expect(divs[0].children[0].textContent).to.equal('Chord requires frets');
    expect(divs[1].children[0].svg).to.contain('C Major');
    expect(divs[2].children[0].className).to.equal('fretdrom-error');
    expect(divs[3].children[0].svg).to.match(/^<svg /);
    expect(errors).to.have.length(2);
  });

  it('renderElement parses an object and a JSON5 string', function() {
    const fromObject = new FakeNode('div');
    const fromString = new FakeNode('div');
    const stale = fromObject.appendChild(new FakeNode('svg'));
    renderElement(0, { chord: { name: "Em", frets: "022000" } }, fromObject);
    renderElement(0, '{ chord: { name: "Em", frets: "022000" } }', fromString);
    expect(fromObject.children).to.have.length(1);
    expect(fromObject.children[0]).to.not.equal(stale);
    expect(fromObject.children[0].svg).to.contain('Em');
    expect(fromString.children[0].svg).to.equal(fromObject.children[0].svg);
  });

  it('renderElement throws the parse error for an invalid diagram', function() {
    expect(() => renderElement(0, { chord: { name: 'x' } }, new FakeNode('div')))
      .to.throw('Chord requires frets');
  });
});
