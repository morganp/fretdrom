'use strict';

const eva = require('./eva');
const renderElement = require('./render-element');

// Replaces every <script type="fretdrom"> with an inline SVG. A bad diagram
// shows its error message in place of the diagram.
function processAll() {
  const scripts = document.querySelectorAll('script[type="fretdrom"]');
  const count = scripts.length;
  scripts.forEach((el, i) => {
    el.id = 'FretDrom_Input_' + i;
    const div = document.createElement('div');
    div.id = 'FretDrom_Display_' + i;
    el.parentNode.insertBefore(div, el);
  });
  for (let i = 0; i < count; i++) {
    try {
      const source = eva('FretDrom_Input_' + i);
      renderElement(i, source, document.getElementById('FretDrom_Display_' + i));
    } catch(e) {
      console.error('FretDrom error for diagram ' + i + ':', e);
      const div = document.getElementById('FretDrom_Display_' + i);
      const pre = document.createElement('pre');
      pre.className = 'fretdrom-error';
      pre.textContent = e.message;
      while (div.firstChild) div.removeChild(div.firstChild);
      div.appendChild(pre);
    }
  }
}

module.exports = processAll;
