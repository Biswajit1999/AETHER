// Desktop/mobile particle and resolution tiers, plus a simple adaptive-quality controller.
// See "Test gates" / performance targets in the production spec: p95 frame-time thresholds
// drive tier changes rather than continuous adjustment, which is itself distracting.

export const TIERS = {
  desktop: { particleMultiplier: 1, pixelRatioCap: 2 },
  mobile: { particleMultiplier: 0.45, pixelRatioCap: 2 },
  mobileSafe: { particleMultiplier: 0.22, pixelRatioCap: 1 }
};

export function baseTier({ coarsePointer }) {
  return coarsePointer ? TIERS.mobile : TIERS.desktop;
}

export function createAdaptiveQuality(initialTierName) {
  let tierName = initialTierName;
  const frameTimes = [];
  const WINDOW = 90;

  function percentile95() {
    if (frameTimes.length < 10) return 0;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  return {
    sample(deltaMs) {
      frameTimes.push(deltaMs);
      if (frameTimes.length > WINDOW) frameTimes.shift();
      const p95 = percentile95();
      if (p95 > 33.3) {
        tierName = 'mobileSafe';
      } else if (p95 > 20 && tierName === 'desktop') {
        tierName = 'mobile';
      }
      return tierName;
    },
    get tierName() {
      return tierName;
    },
    get tier() {
      return TIERS[tierName];
    }
  };
}
