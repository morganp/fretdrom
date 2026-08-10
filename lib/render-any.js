'use strict';

const renderChord = require('./render-chord');
const renderChords = require('./render-chords');
const renderScale = require('./render-scale');
const renderTab = require('./render-tab');
const resolveSkin = require('./resolve-skin');

function renderAny(id, source, skins, defaultSkin) {
  // Per-diagram skin overrides: any config key other than the skin name and
  // the tab-only "bar" setting is layered on top of the chosen skin. Lets a
  // single diagram tweak things like low_string (e.g. ukulele reentrant tuning).
  const skin = resolveSkin(source.config, skins, defaultSkin);
  if (source.type === 'chord')  return renderChord(source, skin);
  if (source.type === 'chords') return renderChords(source, skin, skins, defaultSkin);
  if (source.type === 'scale')  return renderScale(source, skin);
  if (source.type === 'tab')    return renderTab(source, skin);
  throw new Error('Unknown type: ' + source.type);
}

module.exports = renderAny;
