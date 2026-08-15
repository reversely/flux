/**
 * Generates src/map/mapHtml.generated.ts: one self-contained HTML document
 * carrying MapLibre GL JS, the pmtiles protocol, the light-minimal style,
 * and base64 glyph PBFs, so the map WebView needs no network beyond tiles.
 * Runs on postinstall next to sync-fonts.mjs; the output is gitignored.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const { layers, namedFlavor } = require('@protomaps/basemaps');

// Light-minimal palette from src/theme/tokens.ts: paper field, near-white
// land, steel water, whisper-grey roads, ink labels. Keys not overridden
// keep the Protomaps light flavor value.
const flavor = {
  ...namedFlavor('light'),
  background: '#F2F4F5',
  earth: '#F7F8F9',
  water: '#C9D8E2',
  glacier: '#F4F7F8',
  sand: '#EFEDE6',
  beach: '#EFEDE6',
  wood_a: '#EBF0EA',
  wood_b: '#E7EDE7',
  scrub_a: '#EDF1EC',
  scrub_b: '#EAEFE9',
  park_a: '#EDF2EC',
  park_b: '#E9EFE8',
  hospital: '#F3F1F1',
  industrial: '#F1F2F3',
  school: '#F2F1EE',
  zoo: '#EFF1EE',
  military: '#F0F0EE',
  aerodrome: '#EFF1F2',
  runway: '#E2E7EA',
  pedestrian: '#F2F3F4',
  pier: '#EDF0F2',
  buildings: '#E9ECEE',
  other: '#FFFFFF',
  minor_service: '#FFFFFF',
  minor_a: '#FFFFFF',
  minor_b: '#FFFFFF',
  link: '#FFFFFF',
  major: '#FFFFFF',
  highway: '#F0EEE6',
  minor_service_casing: '#E8ECEF',
  minor_casing: '#E5EAED',
  link_casing: '#DCE2E6',
  major_casing_early: '#DCE2E6',
  major_casing_late: '#DCE2E6',
  highway_casing_early: '#D3DBE0',
  highway_casing_late: '#D3DBE0',
  railway: '#DDE3E7',
  boundaries: '#9AA7AF',
  city_label: '#1C2B36',
  city_label_halo: '#FFFFFF',
  subplace_label: '#51626E',
  subplace_label_halo: '#FFFFFF',
  state_label: '#74858F',
  state_label_halo: '#FFFFFF',
  country_label: '#51626E',
  ocean_label: '#6F93A8',
  roads_label_minor: '#74858F',
  roads_label_minor_halo: '#FFFFFF',
  roads_label_major: '#51626E',
  roads_label_major_halo: '#FFFFFF',
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
    'hillshade-exaggeration': 0.35,
    'hillshade-shadow-color': '#A9B8C0',
    'hillshade-highlight-color': '#FFFFFF',
    'hillshade-accent-color': '#C9D8E2',
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
<style>html, body, #map { margin: 0; height: 100%; background: #F2F4F5; }</style>
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
</script>
</body>
</html>`;

mkdirSync(join(appDir, 'src', 'map'), { recursive: true });
writeFileSync(
  join(appDir, 'src', 'map', 'mapHtml.generated.ts'),
  '// Generated by scripts/build-map-html.mjs. Do not edit.\n' +
    'export const MAP_HTML: string = ' +
    JSON.stringify(html) +
    ';\n',
);
console.log(`mapHtml.generated.ts written (${(html.length / 1024).toFixed(0)} KB)`);
