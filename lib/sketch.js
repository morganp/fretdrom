'use strict';

function r(n) { return +n.toFixed(1); }

// Deterministic jitter -- same coordinates always produce the same wobble
function jitter(s, amplitude) {
  return (Math.sin(s * 127.1) * 0.5 + Math.sin(s * 311.7) * 0.5) * amplitude;
}

function seedFor(x1, y1, x2, y2) {
  return x1 * 0.013 + y1 * 0.027 + x2 * 0.009 + y2 * 0.031;
}

// Returns a ['path', {...}] cubic bezier that looks like a hand-drawn line
function sketchLine(x1, y1, x2, y2, attrs, amplitude) {
  const amp = amplitude || 1.5;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return ['line', { x1, y1, x2, y2, ...attrs }];

  // Perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;
  const s = seedFor(x1, y1, x2, y2);

  // Control points at 1/3 and 2/3 along the line, pushed perpendicularly
  const cx1 = r(x1 + dx / 3 + px * jitter(s,     amp));
  const cy1 = r(y1 + dy / 3 + py * jitter(s,     amp));
  const cx2 = r(x1 + dx * 2 / 3 + px * jitter(s + 1, amp));
  const cy2 = r(y1 + dy * 2 / 3 + py * jitter(s + 1, amp));

  const d = `M ${x1} ${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  return ['path', { ...attrs, d, fill: 'none' }];
}

// Bold wobbly line in place of the nut rect -- looks like a thick pencil stroke
function sketchNut(x1, y, width, skin) {
  const { nut_color, nut_width: NW = 4, sketch_amplitude: amp = 1.5 } = skin;
  return sketchLine(x1, y + NW / 2, x1 + width, y + NW / 2, {
    stroke: nut_color,
    'stroke-width': NW,
    'stroke-linecap': 'round'
  }, amp);
}

module.exports = { sketchLine, sketchNut };
