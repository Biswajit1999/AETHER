// Runtime quality is governed by measured frame time, not device labels alone.
// Hysteresis prevents a single expensive frame from visibly changing resolution.

export const QUALITY_PROFILES = Object.freeze({
  eco: Object.freeze({ label: 'Eco', pixelRatioCap: 1, particleMultiplier: 0.45 }),
  balanced: Object.freeze({ label: 'Balanced', pixelRatioCap: 1.5, particleMultiplier: 0.75 }),
  studio: Object.freeze({ label: 'Studio', pixelRatioCap: 2, particleMultiplier: 1 })
});

const PROFILE_ORDER = ['eco', 'balanced', 'studio'];

function percentile(values, proportion) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * proportion))];
}

export function createPerformanceGovernor(options = {}) {
  const coarsePointer = Boolean(options.coarsePointer);
  const devicePixelRatio = Math.max(1, Number(options.devicePixelRatio) || 1);
  const windowSize = Math.max(12, Number(options.windowSize) || 90);
  const evaluationInterval = Math.max(4, Number(options.evaluationInterval) || 30);
  const slowThresholdMs = Number(options.slowThresholdMs) || 24;
  const fastThresholdMs = Number(options.fastThresholdMs) || 17.2;
  let mode = options.mode || 'auto';
  let profileName = coarsePointer ? 'eco' : 'balanced';
  let samplesSinceEvaluation = 0;
  let slowWindows = 0;
  let fastWindows = 0;
  let changed = true;
  const frameTimes = [];

  function applyManualMode() {
    if (mode !== 'auto' && QUALITY_PROFILES[mode]) profileName = mode;
  }

  function snapshot() {
    const p95Ms = percentile(frameTimes, 0.95);
    const medianMs = percentile(frameTimes, 0.5);
    const result = {
      mode,
      profileName,
      profile: QUALITY_PROFILES[profileName],
      pixelRatio: Math.min(devicePixelRatio, QUALITY_PROFILES[profileName].pixelRatioCap),
      p95Ms,
      fps: medianMs > 0 ? Math.min(240, 1000 / medianMs) : 0,
      changed
    };
    changed = false;
    return result;
  }

  function evaluate() {
    if (mode !== 'auto' || frameTimes.length < Math.min(windowSize, 20)) return;
    const p95Ms = percentile(frameTimes, 0.95);
    slowWindows = p95Ms > slowThresholdMs ? slowWindows + 1 : 0;
    fastWindows = p95Ms < fastThresholdMs ? fastWindows + 1 : 0;
    const currentIndex = PROFILE_ORDER.indexOf(profileName);
    if (slowWindows >= 2 && currentIndex > 0) {
      profileName = PROFILE_ORDER[currentIndex - 1];
      slowWindows = 0;
      fastWindows = 0;
      changed = true;
    } else if (fastWindows >= 4 && currentIndex < PROFILE_ORDER.length - 1) {
      profileName = PROFILE_ORDER[currentIndex + 1];
      slowWindows = 0;
      fastWindows = 0;
      changed = true;
    }
  }

  applyManualMode();

  return {
    sample(deltaMs) {
      if (Number.isFinite(deltaMs) && deltaMs > 0 && deltaMs < 250) {
        frameTimes.push(deltaMs);
        if (frameTimes.length > windowSize) frameTimes.shift();
        samplesSinceEvaluation += 1;
        if (samplesSinceEvaluation >= evaluationInterval) {
          samplesSinceEvaluation = 0;
          evaluate();
        }
      }
      return snapshot();
    },
    setMode(nextMode) {
      if (nextMode !== 'auto' && !QUALITY_PROFILES[nextMode]) throw new RangeError(`Unknown quality mode: ${nextMode}`);
      mode = nextMode;
      if (mode === 'auto') profileName = coarsePointer ? 'eco' : 'balanced';
      applyManualMode();
      slowWindows = 0;
      fastWindows = 0;
      changed = true;
      return snapshot();
    },
    resetMeasurements() {
      frameTimes.length = 0;
      samplesSinceEvaluation = 0;
      slowWindows = 0;
      fastWindows = 0;
    },
    snapshot
  };
}

// Compatibility exports for early AETHER experiments.
export const TIERS = Object.freeze({
  desktop: QUALITY_PROFILES.studio,
  mobile: QUALITY_PROFILES.balanced,
  mobileSafe: QUALITY_PROFILES.eco
});

export function baseTier({ coarsePointer }) {
  return coarsePointer ? TIERS.mobile : TIERS.desktop;
}

export function createAdaptiveQuality(initialTierName = 'desktop') {
  const mode = initialTierName === 'mobileSafe' ? 'eco' : initialTierName === 'mobile' ? 'balanced' : 'studio';
  const governor = createPerformanceGovernor({ mode });
  return {
    sample(deltaMs) {
      const state = governor.sample(deltaMs);
      return state.profileName === 'eco' ? 'mobileSafe' : state.profileName === 'balanced' ? 'mobile' : 'desktop';
    },
    get tierName() {
      const name = governor.snapshot().profileName;
      return name === 'eco' ? 'mobileSafe' : name === 'balanced' ? 'mobile' : 'desktop';
    },
    get tier() { return governor.snapshot().profile; }
  };
}
