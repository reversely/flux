/**
 * Generates assets/map/index.html: one self-contained document carrying
 * MapLibre GL JS, the pmtiles protocol, the light-minimal style, and base64
 * glyph PBFs, so the map WebView needs no network beyond tiles. It ships as
 * an asset rather than a JS string, which keeps 2 MB out of every bundle.
 * Runs on postinstall next to sync-fonts.mjs; the output is gitignored.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const { layers, namedFlavor } = require('@protomaps/basemaps');

// Night-navigation palette: the deep blue world of the dark home
// (src/theme/biome.ts) applied to the basemap. Field falls from slate navy
// to near-black, water reads as luminous blue, land vegetation keeps a
// faint green cast, roads are muted slate, labels are moonlit blue-grey.
// Keys not overridden keep the Protomaps dark flavor value.
const flavor = {
  ...namedFlavor('dark'),
  background: '#0B1420',
  earth: '#111C2B',
  water: '#1E4569',
  glacier: '#16273C',
  sand: '#182335',
  beach: '#182335',
  wood_a: '#122230',
  wood_b: '#101F2C',
  scrub_a: '#122130',
  scrub_b: '#111F2D',
  park_a: '#122231',
  park_b: '#101F2D',
  hospital: '#131E2E',
  industrial: '#121D2C',
  school: '#131E2D',
  zoo: '#121F2D',
  military: '#121D2B',
  aerodrome: '#121E2D',
  runway: '#1B2A3D',
  pedestrian: '#13202F',
  pier: '#152334',
  buildings: '#1B2C40',
  other: '#243651',
  minor_service: '#243651',
  minor_a: '#243651',
  minor_b: '#243651',
  link: '#2A3F5C',
  major: '#2F4664',
  highway: '#3A5678',
  minor_service_casing: '#0B1420',
  minor_casing: '#0B1420',
  link_casing: '#0B1420',
  major_casing_early: '#0B1420',
  major_casing_late: '#0B1420',
  highway_casing_early: '#091220',
  highway_casing_late: '#091220',
  railway: '#20304A',
  boundaries: '#3E5570',
  city_label: '#C6D6E4',
  city_label_halo: '#0B1420',
  subplace_label: '#8CA3B8',
  subplace_label_halo: '#0B1420',
  state_label: '#5E7891',
  state_label_halo: '#0B1420',
  country_label: '#8CA3B8',
  ocean_label: '#4E7EA6',
  roads_label_minor: '#7590AB',
  roads_label_minor_halo: '#0B1420',
  roads_label_major: '#A6BCD1',
  roads_label_major_halo: '#0B1420',
};

// Survival-minimal density: POI and address layers add urban clutter the
// backcountry use case never reads, so they drop from the style entirely.
const baseLayers = layers('basemap', flavor, { lang: 'en' }).filter(
  (l) => !l.id.includes('pois') && !l.id.includes('address'),
);

const HILLSHADE = {
  id: 'hillshade',
  type: 'hillshade',
  source: 'terrain',
  paint: {
    'hillshade-exaggeration': 0.45,
    'hillshade-shadow-color': '#04080E',
    'hillshade-highlight-color': '#3A5678',
    'hillshade-accent-color': '#1E4569',
  },
};

const style = {
  version: 8,
  glyphs: 'local://glyphs/{fontstack}/{range}.pbf',
  sources: {},
  layers: baseLayers,
};

const glyphDir = join(appDir, 'assets', 'map', 'glyphs');
const glyphs = {};
for (const face of readdirSync(glyphDir)) {
  for (const file of readdirSync(join(glyphDir, face))) {
    glyphs[`${face}/${file}`] = readFileSync(join(glyphDir, face, file)).toString('base64');
  }
}

// Plain path join: pmtiles' exports map blocks require.resolve of dist files.
const inline = (path) =>
  readFileSync(join(appDir, 'node_modules', path), 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>${readFileSync(join(appDir, 'node_modules', 'maplibre-gl/dist/maplibre-gl.css'), 'utf8')}</style>
<style>html, body, #map { margin: 0; height: 100%; background: linear-gradient(180deg, #10203A 0%, #0B1420 55%, #070D16 100%); }</style>
</head>
<body>
<div id="map"></div>
<script>${inline('maplibre-gl/dist/maplibre-gl.js')}</script>
<script>${inline('pmtiles/dist/pmtiles.js')}</script>
<script>
var GLYPHS = ${JSON.stringify(glyphs)};
var STYLE = ${JSON.stringify(style)};
var HILLSHADE = ${JSON.stringify(HILLSHADE)};
var config = window.__MAP_CONFIG || {};
var post = function (msg) {
  if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
};

maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);
maplibregl.addProtocol('local', function (params) {
  var key = params.url.replace('local://glyphs/', '');
  var b64 = GLYPHS[decodeURIComponent(key)];
  if (!b64) { return Promise.reject(new Error('no glyph ' + key)); }
  var bytes = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
  return Promise.resolve({ data: bytes.buffer });
});

STYLE.sources.basemap = {
  type: 'vector',
  url: 'pmtiles://' + config.serverUrl + '/v1/tiles/archive',
  attribution: '&copy; OpenStreetMap',
};
if (config.terrain) {
  STYLE.sources.terrain = config.terrain;
  // Hillshade draws under water and everything above it.
  var waterAt = STYLE.layers.findIndex(function (l) { return l.id === 'water'; });
  STYLE.layers.splice(waterAt < 0 ? STYLE.layers.length : waterAt, 0, HILLSHADE);
}

var map = new maplibregl.Map({
  container: 'map',
  style: STYLE,
  center: [-120.7, 47.35],
  zoom: 6.2,
  maxZoom: 15,
  attributionControl: { compact: true },
});
map.on('load', function () { post({ type: 'loaded' }); });
map.on('error', function (e) {
  var status = e.error && (e.error.status || (e.error.cause && e.error.cause.status));
  if (e.sourceId === 'basemap' && (status === 503 || status === 404)) {
    post({ type: 'archive-missing' });
  }
});

// ---- Position, observations, and gestures over the native bridge ----

var CATEGORY_COLOR = {
  water: '#4FA8E8', food: '#7BC98A', hazard: '#E8735F',
  camp: '#E8C25F', note: '#9DB2C6'
};
var lastFix = null;
var emptyFC = { type: 'FeatureCollection', features: [] };

function metersToPixels(meters, lat, zoom) {
  return meters / (156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom));
}

function refreshAccuracyRing() {
  if (!lastFix || !map.getLayer('me-accuracy')) { return; }
  var px = metersToPixels(lastFix.accuracy || 0, lastFix.lat, map.getZoom());
  map.setPaintProperty('me-accuracy', 'circle-radius', Math.min(Math.max(px, 0), 400));
}

map.on('load', function () {
  map.addSource('me', { type: 'geojson', data: emptyFC });
  map.addSource('obs', { type: 'geojson', data: emptyFC });
  map.addLayer({ id: 'me-accuracy', type: 'circle', source: 'me', paint: {
    'circle-color': '#4FA8E8', 'circle-opacity': 0.12,
    'circle-stroke-color': '#4FA8E8', 'circle-stroke-opacity': 0.3,
    'circle-stroke-width': 1, 'circle-radius': 0 } });
  map.addLayer({ id: 'me-glow', type: 'circle', source: 'me', paint: {
    'circle-color': '#4FA8E8', 'circle-opacity': 0.25, 'circle-radius': 14,
    'circle-blur': 0.6 } });
  map.addLayer({ id: 'me-dot', type: 'circle', source: 'me', paint: {
    'circle-color': '#4FA8E8', 'circle-radius': 6,
    'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5 } });
  map.addSource('route', { type: 'geojson', data: emptyFC });
  map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: {
    'line-color': '#4FA8E8', 'line-width': 2.5, 'line-dasharray': [2, 2],
    'line-opacity': 0.9 } });
  map.addLayer({ id: 'route-end', type: 'circle', source: 'route',
    filter: ['==', '$type', 'Point'], paint: {
    'circle-color': '#4FA8E8', 'circle-radius': 7,
    'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'obs-dots', type: 'circle', source: 'obs', paint: {
    'circle-color': ['match', ['get', 'category'],
      'water', CATEGORY_COLOR.water, 'food', CATEGORY_COLOR.food,
      'hazard', CATEGORY_COLOR.hazard, 'camp', CATEGORY_COLOR.camp,
      CATEGORY_COLOR.note],
    'circle-radius': 7, 'circle-stroke-color': '#0B1420',
    'circle-stroke-width': 2 } });
  map.addLayer({ id: 'obs-labels', type: 'symbol', source: 'obs', layout: {
    'text-field': ['get', 'label'],
    'text-font': ['Noto Sans Regular'],
    'text-size': 11, 'text-offset': [0, 1.3], 'text-anchor': 'top',
    'text-optional': true },
    paint: { 'text-color': '#C6D6E4', 'text-halo-color': '#0B1420',
      'text-halo-width': 1.5 } });
  map.on('zoom', refreshAccuracyRing);
  map.on('click', 'obs-dots', function (e) {
    if (e.features && e.features[0]) {
      post({ type: 'obs-tap', id: e.features[0].properties.id });
    }
  });
});

// RN calls window.__native(msg) through injectJavaScript.
window.__native = function (msg) {
  if (msg.type === 'fix') {
    lastFix = msg;
    var src = map.getSource('me');
    if (src) {
      src.setData({ type: 'FeatureCollection', features: [{
        type: 'Feature', geometry: { type: 'Point', coordinates: [msg.lng, msg.lat] },
        properties: {} }] });
      refreshAccuracyRing();
    }
  } else if (msg.type === 'obs') {
    var obs = map.getSource('obs');
    if (obs) { obs.setData(msg.data); }
  } else if (msg.type === 'route') {
    var route = map.getSource('route');
    if (route) {
      route.setData({ type: 'FeatureCollection', features: [
        { type: 'Feature', geometry: { type: 'LineString',
          coordinates: [[msg.fromLng, msg.fromLat], [msg.toLng, msg.toLat]] },
          properties: {} },
        { type: 'Feature', geometry: { type: 'Point',
          coordinates: [msg.toLng, msg.toLat] }, properties: {} }] });
      map.fitBounds([[Math.min(msg.fromLng, msg.toLng), Math.min(msg.fromLat, msg.toLat)],
        [Math.max(msg.fromLng, msg.toLng), Math.max(msg.fromLat, msg.toLat)]],
        { padding: 80, duration: 900 });
    }
  } else if (msg.type === 'route-clear') {
    var routeSrc = map.getSource('route');
    if (routeSrc) { routeSrc.setData(emptyFC); }
  } else if (msg.type === 'fly') {
    map.flyTo({ center: [msg.lng, msg.lat], zoom: Math.max(map.getZoom(), msg.zoom || 13),
      duration: 900, essential: true });
  }
};

// Long-press (450 ms, under 10 px of drift) drops an observation.
var press = null;
map.getCanvas().addEventListener('touchstart', function (e) {
  if (e.touches.length !== 1) { press = null; return; }
  var t = e.touches[0];
  press = { x: t.clientX, y: t.clientY, timer: setTimeout(function () {
    var ll = map.unproject([press.x, press.y]);
    post({ type: 'longpress', lng: ll.lng, lat: ll.lat });
    press = null;
  }, 450) };
});
map.getCanvas().addEventListener('touchmove', function (e) {
  if (!press) { return; }
  var t = e.touches[0];
  if (Math.abs(t.clientX - press.x) > 10 || Math.abs(t.clientY - press.y) > 10) {
    clearTimeout(press.timer); press = null;
  }
});
map.getCanvas().addEventListener('touchend', function () {
  if (press) { clearTimeout(press.timer); press = null; }
});
</script>
</body>
</html>`;

mkdirSync(join(appDir, 'assets', 'map'), { recursive: true });
writeFileSync(join(appDir, 'assets', 'map', 'index.html'), html);
console.log(`assets/map/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
