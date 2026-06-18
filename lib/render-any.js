'use strict';

const renderChord = require('./render-chord');
const renderScale = require('./render-scale');
const renderTab = require('./render-tab');

function renderAny(id, source, skins, defaultSkin) {
  const cfg = source.config || {};
  const base = skins[cfg.skin] || skins[defaultSkin] || skins.default;
  // Per-diagram skin overrides: any config key other than the skin name and
  // the tab-only "bar" setting is layered on top of the chosen skin. Lets a
  // single diagram tweak things like low_string (e.g. ukulele reentrant tuning).
  const { skin: _skinName, bar: _bar, ...overrides } = cfg;
  const skin = Object.keys(overrides).length ? { ...base, ...overrides } : base;
  if (source.type === 'chord') return renderChord(source, skin);
  if (source.type === 'scale') return renderScale(source, skin);
  if (source.type === 'tab')   return renderTab(source, skin);
  throw new Error('Unknown type: ' + source.type);
}

module.exports = renderAny;
