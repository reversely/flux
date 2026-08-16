import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { HOME_BIOME, rgb } from '@/theme/biome';

/**
 * The home world, held still for every other screen: the same biome gradient,
 * top glow, and faceted terrain, with no clock and no motes. Nothing animates
 * here, so a page that scrolls or reads never pays for a repaint, and the app
 * keeps one continuous look instead of a dark home over light pages.
 */
const SRC = `
uniform float2 res;
uniform float3 top;
uniform float3 bottom;
uniform float3 glow;
uniform float3 terrain;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

// Faceted ridge: flat segments meeting at angles, the low-poly look.
float ridge(float x, float seed, float base, float amp) {
  float seg = floor(x * 6.0);
  float f = fract(x * 6.0);
  float a = hash(seg + seed * 91.7);
  float b = hash(seg + 1.0 + seed * 91.7);
  return base + amp * mix(a, b, f);
}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float3 col = mix(top, bottom, smoothstep(0.0, 1.0, uv.y));

  // One soft light source behind the top bar.
  float d = distance(uv * float2(1.0, 1.7), float2(0.5, 0.06));
  col += glow * exp(-d * d * 7.0) * 0.13;

  // Two silhouettes low on the page, well clear of the reading area.
  float farY = ridge(uv.x, 3.0, 0.80, 0.10);
  col = mix(col, mix(terrain, top, 0.5), smoothstep(farY, farY + 0.004, uv.y));

  float nearY = ridge(uv.x + 0.37, 7.0, 0.90, 0.08);
  col = mix(col, mix(terrain, bottom, 0.55), smoothstep(nearY, nearY + 0.003, uv.y));

  // Grain keeps the gradient from banding on a dark screen.
  float grain = hash(xy.x + xy.y * 311.7) - 0.5;
  col += grain * 0.02;

  return half4(half3(col), 1.0);
}
`;

const effect = Skia.RuntimeEffect.Make(SRC);

const PALETTE = {
  top: rgb(HOME_BIOME.top),
  bottom: rgb(HOME_BIOME.bottom),
  glow: rgb(HOME_BIOME.glow),
  terrain: rgb(HOME_BIOME.terrain),
};

export function PageBackdrop() {
  const { width, height } = useWindowDimensions();
  if (effect === null) {
    return null;
  }
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader source={effect} uniforms={{ res: [width, height], ...PALETTE }} />
      </Fill>
    </Canvas>
  );
}
