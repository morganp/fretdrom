'use strict';

function r(n) { return +n.toFixed(1); }

function jitter(s, amplitude) {
  return (Math.sin(s * 127.1) * 0.5 + Math.sin(s * 311.7) * 0.5) * amplitude;
}

function seedFor(x1, y1, x2, y2) {
  return x1 * 0.013 + y1 * 0.027 + x2 * 0.009 + y2 * 0.031;
}

// N equally-spaced points along the line; interior points are nudged perpendicularly
function warpedPoints(x1, y1, x2, y2, amplitude, seed, n) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = -dy / len;
  const py =  dx / len;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t  = i / (n - 1);
    const bx = x1 + dx * t;
    const by = y1 + dy * t;
    if (i === 0 || i === n - 1) {
      pts.push([r(bx), r(by)]);
    } else {
      const j = jitter(seed + i * 0.37, amplitude);
      pts.push([r(bx + px * j), r(by + py * j)]);
    }
  }
  return pts;
}

// Catmull-Rom spline through pts → cubic bezier SVG path string
function crPath(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    d += ` C ${r(p1[0] + (p2[0] - p0[0]) / 6)},${r(p1[1] + (p2[1] - p0[1]) / 6)}` +
         ` ${r(p2[0] - (p3[0] - p1[0]) / 6)},${r(p2[1] - (p3[1] - p1[1]) / 6)}` +
         ` ${p2[0]},${p2[1]}`;
  }
  return d;
}

// Returns a <g> with two paths: a primary wobbly stroke and a faint secondary
// stroke with different wobble -- the double-stroke pencil effect
function sketchLine(x1, y1, x2, y2, attrs, amplitude) {
  const amp = amplitude || 2.5;
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return ['line', { x1, y1, x2, y2, ...attrs }];

  const s  = seedFor(x1, y1, x2, y2);
  // More segments for longer lines (capped at 7 waypoints)
  const n  = Math.min(7, Math.max(3, Math.round(len / 35) + 2));
  const sw = attrs['stroke-width'] || 1;

  const primary = ['path', {
    ...attrs,
    d: crPath(warpedPoints(x1, y1, x2, y2, amp, s, n)),
    fill: 'none'
  }];

  // Second pass: slightly thinner, different wobble, faint -- gives pencil texture
  const secondary = ['path', {
    ...attrs,
    d: crPath(warpedPoints(x1, y1, x2, y2, amp * 0.6, s + 13.7, n)),
    fill:             'none',
    'stroke-width':   r(sw * 0.5),
    'stroke-opacity': '0.35'
  }];

  return ['g', {}, primary, secondary];
}

// Thick wobbly line in place of the nut rect
function sketchNut(x1, y, width, skin) {
  const { nut_color, nut_width: NW = 4, sketch_amplitude: amp = 2.5 } = skin;
  return sketchLine(x1, y + NW / 2, x1 + width, y + NW / 2, {
    stroke: nut_color,
    'stroke-width':   NW,
    'stroke-linecap': 'round'
  }, amp);
}

module.exports = { sketchLine, sketchNut };
