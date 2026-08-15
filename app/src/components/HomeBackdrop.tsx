import { useIsFocused } from 'expo-router';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions } from 'react-native';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

import { HOME_BIOME, rgb } from '@/theme/biome';

/**
 * The dark home's world, ported from the scroll-journey cave-hero rig: one
 * SKSL pass draws the biome gradient, a top glow with three fanned god rays,
 * two faceted terrain silhouettes (the near layer parallaxes against chat
 * scroll, so scroll stays the clock), drifting motes, and grain. Reduced
 * motion freezes the clock; the scene stays, nothing drifts.
 */

const SRC = `
uniform float2 res;
uniform float time;
uniform float scroll;
uniform float3 top;
uniform float3 bottom;
uniform float3 glow;
uniform float3 terrain;
uniform float3 mote;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

float ridge(float x, float seed, float base, float amp) {
  float seg = floor(x * 7.0);
  float f = fract(x * 7.0);
  float a = hash(seg + seed * 91.7);
  float b = hash(seg + 1.0 + seed * 91.7);
  return base + amp * mix(a, b, f);
}

float ray(float2 uv, float offset, float slope, float width) {
  float x = uv.x - 0.5 - offset - uv.y * slope;
  float fall = 1.0 - smoothstep(0.0, 0.85, uv.y);
  return (1.0 - smoothstep(0.0, width, abs(x))) * fall;
}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float3 col = mix(top, bottom, smoothstep(0.05, 1.0, uv.y));

  float d = distance(uv * float2(1.0, 1.6), float2(0.5, 0.16));
  col += glow * exp(-d * d * 9.0) * 0.16;

  float rays = ray(uv, -0.12, -0.30, 0.040)
             + ray(uv, 0.02, 0.04, 0.060)
             + ray(uv, 0.15, 0.34, 0.040);
  col += glow * rays * 0.10;

  float farY = ridge(uv.x + scroll * 0.00002, 3.0, 0.62, 0.12);
  float farEdge = smoothstep(farY, farY + 0.004, uv.y);
  col = mix(col, mix(terrain, top, 0.55), farEdge);

  float midY = ridge(uv.x + scroll * 0.00004 + 0.53, 5.0, 0.72, 0.11);
  float midEdge = smoothstep(midY, midY + 0.004, uv.y);
  col = mix(col, terrain, midEdge);

  float nearY = ridge(uv.x + scroll * 0.00008 + 0.37, 7.0, 0.82, 0.10);
  float nearEdge = smoothstep(nearY, nearY + 0.003, uv.y);
  col = mix(col, mix(terrain, bottom, 0.6), nearEdge);

  for (float i = 0.0; i < 9.0; i += 1.0) {
    float2 p = float2(hash(i + 1.0), hash(i + 40.0));
    p.y = fract(p.y * 0.8 + 0.1 - time * (0.008 + 0.012 * hash(i + 80.0)));
    p.x += sin(time * 0.3 + i) * 0.015;
    float flicker = 0.35 + 0.65 * abs(sin(time * (0.6 + hash(i)) + i * 2.0));
    float md = distance(uv * float2(res.x / res.y, 1.0), p * float2(res.x / res.y, 1.0));
    col += mote * exp(-md * md * 90000.0) * flicker * 0.35;
    col += mote * exp(-md * md * 9000.0) * flicker * 0.045;
  }

  float grain = hash(xy.x + xy.y * 311.7 + fract(time) * 17.0) - 0.5;
  col += grain * 0.025;

  return half4(half3(col), 1.0);
}
`;

const effect = Skia.RuntimeEffect.Make(SRC);

// Precomputed outside the worklet: useDerivedValue runs on the UI runtime,
// where calling a plain JS function like rgb() throws.
const PALETTE = {
  top: rgb(HOME_BIOME.top),
  bottom: rgb(HOME_BIOME.bottom),
  glow: rgb(HOME_BIOME.glow),
  terrain: rgb(HOME_BIOME.terrain),
  mote: rgb(HOME_BIOME.mote),
};

export function HomeBackdrop({ scrollY }: { scrollY: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const [reduceMotion, setReduceMotion] = useState(false);
  // The stack keeps home mounted under every pushed screen; an unfocused
  // shader must stop redrawing or it repaints full-screen behind every page.
  const focused = useIsFocused();
  const frozen = reduceMotion || !focused;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const animatedUniforms = useDerivedValue(() => ({
    res: [width, height],
    time: clock.value / 1000,
    scroll: scrollY.value,
    ...PALETTE,
  }));
  // A derived value re-notifies the canvas every clock tick even when its
  // contents stop changing, so the frozen scene binds a plain object:
  // same frame, zero redraws.
  const frozenUniforms = { res: [width, height], time: 42, scroll: 0, ...PALETTE };

  if (!effect) {
    return null;
  }
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={effect} uniforms={frozen ? frozenUniforms : animatedUniforms} />
      </Fill>
    </Canvas>
  );
}
