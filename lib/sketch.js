'use strict';

function r(n) { return +n.toFixed(1); }

function jitter(s, amplitude) {
  return (Math.sin(s * 127.1) * 0.5 + Math.sin(s * 311.7) * 0.5) * amplitude;
}

function seedFor(x1, y1, x2, y2) {
  return x1 * 0.013 + y1 * 0.027 + x2 * 0.009 + y2 * 0.031;
}

// N equally-spaced points along the line; interior points nudged perpendicularly
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

// Catmull-Rom spline through pts → cubic bezier SVG path string.
// widthSeeds, if provided, generate per-segment stroke-width attrs via
// individual <path> elements rather than one compound path.
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

// Break the path into individual segment paths with slightly varying stroke-width
// to simulate pencil pressure. Variance is very small (±widthVar * sw).
function segmentPaths(pts, attrs, sw, seed, widthVar) {
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    const d = `M ${p1[0]},${p1[1]} C` +
      ` ${r(p1[0] + (p2[0] - p0[0]) / 6)},${r(p1[1] + (p2[1] - p0[1]) / 6)}` +
      ` ${r(p2[0] - (p3[0] - p1[0]) / 6)},${r(p2[1] - (p3[1] - p1[1]) / 6)}` +
      ` ${p2[0]},${p2[1]}`;
    // Each segment gets a slightly different width
    const w = r(sw * (1 + jitter(seed + i * 5.3, widthVar)));
    segs.push(['path', { ...attrs, d, fill: 'none', 'stroke-width': w }]);
  }
  return segs;
}

function sketchLine(x1, y1, x2, y2, attrs, amplitude) {
  const amp = amplitude || 1.25;
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return ['line', { x1, y1, x2, y2, ...attrs }];

  const s  = seedFor(x1, y1, x2, y2);
  const n  = Math.min(7, Math.max(3, Math.round(len / 35) + 2));
  const sw = attrs['stroke-width'] || 1;

  const pts1 = warpedPoints(x1, y1, x2, y2, amp,       s,        n);
  const pts2 = warpedPoints(x1, y1, x2, y2, amp * 0.6, s + 13.7, n);
  const pts3 = warpedPoints(x1, y1, x2, y2, amp * 0.4, s + 27.3, n);

  // Primary: per-segment varying width (±8% variance) for pencil-pressure feel
  const primarySegs = segmentPaths(pts1, { ...attrs, 'stroke-linecap': 'round' }, sw, s, 0.08);

  // Thin overline: different wobble, adds surface texture
  const secondary = ['path', {
    ...attrs,
    d: crPath(pts2),
    fill:             'none',
    'stroke-width':   r(sw * 0.5),
    'stroke-opacity': '0.35'
  }];

  // Wide underline: slightly broader, very faint -- simulates ink bleed / weight variation
  const tertiary = ['path', {
    ...attrs,
    d: crPath(pts3),
    fill:             'none',
    'stroke-width':   r(sw * 1.4),
    'stroke-opacity': '0.12'
  }];

  return ['g', {}, tertiary, ...primarySegs, secondary];
}

function sketchNut(x1, y, width, skin) {
  const { nut_color, nut_width: NW = 4, sketch_amplitude: amp = 1.25 } = skin;
  return sketchLine(x1, y + NW / 2, x1 + width, y + NW / 2, {
    stroke: nut_color,
    'stroke-width':   NW,
    'stroke-linecap': 'round'
  }, amp);
}

module.exports = { sketchLine, sketchNut };
