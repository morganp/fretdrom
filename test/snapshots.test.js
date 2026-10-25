'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { variants, fixtureNames, imageName, renderFixture } = require('../scripts/render-fixtures');

const snapDir = path.join(__dirname, 'snapshots');

describe('snapshots', function() {
  fixtureNames().forEach(fixture => {
    variants.forEach(([skin, suffix]) => {
      const name = imageName(fixture, suffix);
      it(name + ' matches test/snapshots/' + name + ' (npm run update-snapshots)', function() {
        const file = path.join(snapDir, name);
        expect(fs.existsSync(file), 'missing snapshot, run npm run update-snapshots').to.equal(true);
        expect(renderFixture(fixture, skin)).to.equal(fs.readFileSync(file, 'utf8'));
      });
    });
  });

  it('has no snapshot without a fixture (run npm run update-snapshots)', function() {
    const expected = new Set();
    fixtureNames().forEach(f => variants.forEach(([, suffix]) => expected.add(imageName(f, suffix))));
    const extra = fs.readdirSync(snapDir).filter(f => f.endsWith('.svg') && !expected.has(f));
    expect(extra).to.deep.equal([]);
  });
});
