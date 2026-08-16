const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The map document (MapLibre, pmtiles, style, glyphs; about 2 MB) ships as an
// asset the WebView loads from disk. Bundling it as a JS string instead put it
// in front of Metro on every dev bundle and in every screen's payload.
config.resolver.assetExts.push('html');

module.exports = config;
