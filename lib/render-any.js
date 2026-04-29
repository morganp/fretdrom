'use strict';

const renderChord = require('./render-chord');
const renderScale = require('./render-scale');
const renderTab = require('./render-tab');

function renderAny(id, source, skins, defaultSkin) {
  const skin = skins[source.config && source.config.skin] || skins[defaultSkin] || skins.default;
  if (source.type === 'chord') return renderChord(source, skin);
  if (source.type === 'scale') return renderScale(source, skin);
  if (source.type === 'tab')   return renderTab(source, skin);
  throw new Error('Unknown type: ' + source.type);
}

module.exports = renderAny;
