// Regenerates map.js. Needs: npm i world-atlas@2 us-atlas@3 topojson-client d3-geo simplify-js, plus ne_50m_lakes.geojson from github.com/nvkelso/natural-earth-vector (geojson/). Run: node build-map.mjs
// Geo-go world map: Natural Earth 1:50m land + lakes + country borders, US states (all public domain).
// Same flat projection the game already uses: x = (lng + 180) * s, y = (top - lat) * s.
import fs from 'node:fs'; import { feature, mesh } from 'topojson-client'; import { geoPath, geoArea, geoEquirectangular } from 'd3-geo'; import simplify from 'simplify-js';
const S = 4, TOP = 84, BOTTOM = -58, W = 360 * S, H = (TOP - BOTTOM) * S, TOL = +process.argv[2] || 0.12;
const rd = v => Math.round(v * 10) / 10;
// d3 does the projecting: it cuts shapes at the 180° line (far-east Russia, Wrangel Island, Fiji) and at the map's edges.
const proj = geoEquirectangular().scale(S * 180 / Math.PI).translate([180 * S, TOP * S]).precision(0.05).clipExtent([[-1, -1], [W + 1, H + 1]]);
const pathOf = geoPath(proj);
function toPath(geo, { minArea = 0, closed = true } = {}) {
  const raw = pathOf(geo) || ''; let out = '';
  raw.split(/(?=M)/).forEach(piece => {
    const isClosed = /Z\s*$/.test(piece), nums = piece.match(/-?\d+(\.\d+)?(e-?\d+)?/g) || [];
    let pts = []; for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: +nums[i], y: +nums[i + 1] });
    pts = simplify(pts, TOL, true);
    if (isClosed && pts.length < 4) return; if (!isClosed && pts.length < 2) return;
    if (isClosed && minArea) { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y); if (Math.abs(a / 2) < minArea) return; }
    let str = '', lx, ly;
    pts.forEach((p, i) => { const x = rd(p.x), y = rd(p.y); if (i && x === lx && y === ly) return; str += (i ? 'L' : 'M') + x + ',' + y; lx = x; ly = y; });
    out += str + (isClosed ? 'Z' : '');
  });
  return out;
}
// GeoJSON from some sources winds rings the other way round, which d3 would read as "everything except the lake"
const rewind = fc => ({ type: 'FeatureCollection', features: fc.features.map(f => geoArea(f) > 2 * Math.PI ? { ...f, geometry: { ...f.geometry, coordinates: f.geometry.type === 'Polygon' ? f.geometry.coordinates.map(r => r.slice().reverse()) : f.geometry.coordinates.map(p => p.map(r => r.slice().reverse())) } } : f) });
const land50 = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-50m.json'));
const cty50 = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const us = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-10m.json'));
const lakesAll = rewind(JSON.parse(fs.readFileSync('ne_50m_lakes.geojson')));
const land = toPath(feature(land50, land50.objects.land), { minArea: 0.15 });
// lakes big enough to see at the closest zoom (the Great Lakes, Victoria, Baikal, Titicaca, Winnipeg, ...)
const lakes = { type: 'FeatureCollection', features: lakesAll.features.filter(f => geoArea(f) * 6371 ** 2 > 2000) };
const lakeD = toPath(lakes, { minArea: 0.15 });
const borders = toPath(mesh(cty50, cty50.objects.countries, (a, b) => a !== b), { closed: false });
const states = toPath(mesh(us, us.objects.states, (a, b) => a !== b), { closed: false });
const M = { w: W, h: H, s: S, top: TOP, land, lakes: lakeD, borders, states };
fs.writeFileSync('map.js', '// Geo-go map: Natural Earth 1:50m land, lakes and borders; US states from the US Census (all public domain).\nwindow.FAMILY_MAP = ' + JSON.stringify(M) + ';\n');
console.log('lakes kept', lakes.features.length, '| sizes KB', Object.fromEntries(Object.entries(M).filter(([k, v]) => typeof v === 'string').map(([k, v]) => [k, Math.round(v.length / 1024)])), '| total', Math.round(fs.statSync('map.js').size / 1024), 'KB');
