import { describe, expect, it } from '@jest/globals';

import {
  failingPrompt,
  initialGuidance,
  nextGuidance,
  type QualitySignals,
} from '../guidance';

const pass: QualitySignals = {
  laplacianVar: 500,
  clippedFraction: 0,
  gridDelta: 0,
  lensPosition: 0.3,
};

const blurred: QualitySignals = { ...pass, laplacianVar: 10 };
const glaring: QualitySignals = { ...pass, clippedFraction: 0.2 };

describe('failingPrompt', () => {
  it('passes clean signals', () => {
    expect(failingPrompt(pass)).toBeNull();
  });

  it('prioritizes glare over focus', () => {
    expect(failingPrompt({ ...blurred, clippedFraction: 0.2 })).toBe('glare');
  });

  it('reads a far lens position while sharp as too far', () => {
    expect(failingPrompt({ ...pass, lensPosition: 0.9 })).toBe('distance_far');
  });

  it('reads minimum focus distance while blurred as too close', () => {
    expect(failingPrompt({ ...blurred, lensPosition: 0.01 })).toBe('distance_near');
  });

  it('reads fast motion once the frame is sharp', () => {
    expect(failingPrompt({ ...pass, gridDelta: 50 })).toBe('motion');
  });

  it('skips the distance heuristics without a lens position', () => {
    expect(failingPrompt({ ...blurred, lensPosition: null })).toBe('focus');
  });
});

describe('nextGuidance hysteresis', () => {
  it('surfaces a prompt only after the condition persists', () => {
    let state = nextGuidance(initialGuidance, blurred, 0);
    expect(state.activePrompt).toBeNull();
    state = nextGuidance(state, blurred, 300);
    expect(state.activePrompt).toBeNull();
    state = nextGuidance(state, blurred, 700);
    expect(state.activePrompt).toBe('focus');
  });

  it('keeps the prompt until signals stay clear long enough', () => {
    let state = nextGuidance(initialGuidance, blurred, 0);
    state = nextGuidance(state, blurred, 700);
    expect(state.activePrompt).toBe('focus');
    state = nextGuidance(state, pass, 800);
    expect(state.activePrompt).toBe('focus');
    state = nextGuidance(state, pass, 1500);
    expect(state.activePrompt).toBe('focus');
    state = nextGuidance(state, pass, 1900);
    expect(state.activePrompt).toBeNull();
  });

  it('restarts the surface timer when the failing condition changes', () => {
    let state = nextGuidance(initialGuidance, blurred, 0);
    state = nextGuidance(state, glaring, 300);
    expect(state.activePrompt).toBeNull();
    state = nextGuidance(state, glaring, 700);
    expect(state.activePrompt).toBeNull();
    state = nextGuidance(state, glaring, 950);
    expect(state.activePrompt).toBe('glare');
  });

  it('cancels the clear timer when the condition returns', () => {
    let state = nextGuidance(initialGuidance, blurred, 0);
    state = nextGuidance(state, blurred, 700);
    state = nextGuidance(state, pass, 800);
    state = nextGuidance(state, blurred, 1200);
    state = nextGuidance(state, pass, 1300);
    state = nextGuidance(state, pass, 2000);
    expect(state.activePrompt).toBe('focus');
    state = nextGuidance(state, pass, 2400);
    expect(state.activePrompt).toBeNull();
  });
});
