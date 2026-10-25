'use strict';

// Renders every test fixture through each skin to <outdir>/<name>.svg, where
// <name> is the fixture name with underscores plus a skin suffix (_dark,
// _sketch, _sketch_dark; the default skin has none). Used for docs/images
// (npm run docs) and the committed snapshots in test/snapshots
// (npm run update-snapshots). It is the only writer of both directories.
//
// Exits non-zero when a fixture fails to render, when outdir holds an SVG no
// fixture produces (an orphan), or when README.md or docs/*.md reference an
// image that is missing or that no fixture produces.
const fs = require('fs');
const path = require('path');
const json5 = require('json5');
const onml = require('onml');
const { parse, renderAny } = require('../lib');
const allSkins = require('../lib/all-skins');

const root = path.join(__dirname, '..');
const fixtureDir = path.join(root, 'test', 'fixtures');
const imageDir = path.join(root, 'docs', 'images');

// [skin name, file suffix]
const variants = [
  ['default', ''],
  ['dark', '_dark'],
  ['sketch', '_sketch'],
  ['sketch-dark', '_sketch_dark']
];

function fixtureNames() {
  return fs.readdirSync(fixtureDir).filter(f => f.endsWith('.json5')).sort()
    .map(f => f.replace(/\.json5$/, ''));
}

function imageName(fixture, suffix) {
  return fixture.replace(/-/g, '_') + suffix + '.svg';
}

// Same path as the CLI: JSON5 text, parse, renderAny with a named skin
function renderFixture(fixture, skin) {
  const text = fs.readFileSync(path.join(fixtureDir, fixture + '.json5'), 'utf8');
  return onml.s(renderAny(0, parse(json5.parse(text)), allSkins, skin)) + '\n';
}

// Every image path (relative to the repo root) that README.md or docs/*.md use
function referencedImages() {
  const docs = ['README.md']
    .concat(fs.readdirSync(path.join(root, 'docs')).filter(f => f.endsWith('.md')).map(f => 'docs/' + f));
  const refs = [];
  docs.forEach(doc => {
    const text = fs.readFileSync(path.join(root, doc), 'utf8');
    const re = /!\[[^\]]*\]\(([^)\s]+)\)|<img[^>]*\ssrc="([^"]+)"/g;
    let m;
    while ((m = re.exec(text))) {
      const target = m[1] || m[2];
      if (/^[a-z]+:/i.test(target)) continue;
      refs.push({ doc, file: path.relative(root, path.resolve(root, path.dirname(doc), target)) });
    }
  });
  return refs;
}

function main() {
  const outDir = path.resolve(root, process.argv[2] || 'docs/images');
  const errors = [];
  const produced = new Set();

  fs.mkdirSync(outDir, { recursive: true });
  fixtureNames().forEach(fixture => {
    variants.forEach(([skin, suffix]) => {
      const name = imageName(fixture, suffix);
      produced.add(name);
      try {
        fs.writeFileSync(path.join(outDir, name), renderFixture(fixture, skin), 'utf8');
      } catch (e) {
        errors.push('fixture ' + fixture + '.json5 failed to render with skin ' + skin + ': ' + e.message);
      }
    });
  });
  process.stdout.write('wrote ' + produced.size + ' images to ' + path.relative(root, outDir) + '\n');

  fs.readdirSync(outDir).filter(f => f.endsWith('.svg') && !produced.has(f)).sort().forEach(f => {
    errors.push('orphan image ' + path.relative(root, path.join(outDir, f)) +
      ': no fixture produces it (git rm it, or add a fixture)');
  });

  referencedImages().forEach(({ doc, file }) => {
    const inImages = path.dirname(file) === path.relative(root, imageDir);
    if (!fs.existsSync(path.join(root, file))) {
      errors.push(doc + ' references ' + file + ', which does not exist');
    } else if (inImages && !produced.has(path.basename(file))) {
      errors.push(doc + ' references ' + file + ', which no fixture produces');
    }
  });

  if (errors.length) {
    process.stderr.write('render-fixtures failed:\n' + errors.map(e => '  - ' + e).join('\n') + '\n');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { variants, fixtureNames, imageName, renderFixture };
