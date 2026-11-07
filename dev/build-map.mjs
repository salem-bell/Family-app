// Regenerates map.js. Needs: npm i world-atlas@2 us-atlas@3 topojson-client d3-geo simplify-js, plus ne_50m_lakes.geojson from github.com/nvkelso/natural-earth-vector (geojson/). Run: node build-map.mjs
// Geo-go world map: Natural Earth 1:50m land + lakes + country borders, US states (all public domain).
// Same flat projection the game already uses: x = (lng + 180) * s, y = (top - lat) * s.
import fs from 'node:fs'; import { feature, mesh } from 'topojson-client'; import { geoPath, geoTransform, geoArea } from 'd3-geo'; import simplify from 'simplify-js';
const S = 4, TOP = 84, BOTTOM = -58, W = 360 * S, H = (TOP - BOTTOM) * S, TOL = +process.argv[2] || 0.12;
const rd = v => Math.round(v * 10) / 10;
// project + simplify + round, keeping only what's on the map
function toPath(geo, { minArea = 0, closed = true } = {}) {
  let out = '';
  const ring = (coords) => {
    let pts = coords.map(([lo, la]) => ({ x: (lo + 180) * S, y: (TOP - Math.max(BOTTOM - 2, Math.min(TOP + 2, la))) * S }));
    pts = simplify(pts, TOL, true);
    if (closed && pts.length < 4) return;
    if (closed && minArea) { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y); if (Math.abs(a / 2) < minArea) return; }
    let s = '', lx, ly;
    pts.forEach((p, i) => { const x = rd(p.x), y = rd(p.y); if (i && x === lx && y === ly) return; s += (i ? 'L' : 'M') + x + ',' + y; lx = x; ly = y; });
    out += s + (closed ? 'Z' : '');
  };
  const walk = g => {
    if (!g) return;
    if (g.type === 'FeatureCollection') g.features.forEach(f => walk(f.geometry));
    else if (g.type === 'Feature') walk(g.geometry);
    else if (g.type === 'GeometryCollection') g.geometries.forEach(walk);
    else if (g.type === 'Polygon') g.coordinates.forEach(ring);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(ring));
    else if (g.type === 'LineString') ring(g.coordinates);
    else if (g.type === 'MultiLineString') g.coordinates.forEach(ring);
  };
  walk(geo); return out;
}
const land50 = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-50m.json'));
const cty50 = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const us = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-10m.json'));
const lakesAll = JSON.parse(fs.readFileSync('ne_50m_lakes.geojson'));
const land = toPath(feature(land50, land50.objects.land), { minArea: 0.15 });
// lakes big enough to see at the closest zoom (the Great Lakes, Victoria, Baikal, Titicaca, Winnipeg, ...)
const lakes = { type: 'FeatureCollection', features: lakesAll.features.filter(f => geoArea(f) * 6371 ** 2 > 2000) };
const lakeD = toPath(lakes, { minArea: 0.15 });
const borders = toPath(mesh(cty50, cty50.objects.countries, (a, b) => a !== b), { closed: false });
const states = toPath(mesh(us, us.objects.states, (a, b) => a !== b), { closed: false });
const M = { w: W, h: H, s: S, top: TOP, land, lakes: lakeD, borders, states };
fs.writeFileSync('map.js', '// Geo-go map: Natural Earth 1:50m land, lakes and borders; US states from the US Census (all public domain).\nwindow.FAMILY_MAP = ' + JSON.stringify(M) + ';\n');
console.log('lakes kept', lakes.features.length, '| sizes KB', Object.fromEntries(Object.entries(M).filter(([k, v]) => typeof v === 'string').map(([k, v]) => [k, Math.round(v.length / 1024)])), '| total', Math.round(fs.statSync('map.js').size / 1024), 'KB');
