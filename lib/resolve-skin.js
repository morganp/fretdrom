'use strict';

// Resolves the skin for one diagram: start from the named skin (or an inherited
// base, or the default), then layer any other config keys on top as per-diagram
// overrides. The tab-only "bar" setting is not a skin key.
function resolveSkin(cfg, skins, defaultSkin, base) {
  const config = cfg || {};
  const all = skins || {};
  const chosen = all[config.skin] || base || all[defaultSkin] || all.default;
  const { skin: _skinName, bar: _bar, ...overrides } = config;
  return Object.keys(overrides).length ? { ...chosen, ...overrides } : chosen;
}

module.exports = resolveSkin;
