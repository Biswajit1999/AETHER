// Interactive browser audio analyser. This is the real-time path for previews only —
// deterministic Reel exports must use a precomputed audio-feature envelope instead
// (see scripts/analyse-audio.mjs and scripts/render-frames.mjs), because real-time
// browser audio scheduling is not reproducible frame-for-frame.

export async function createAudioAnalyser(audioElement) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is unavailable.');
  }

  const context = new AudioContextClass();
  const source = context.createMediaElementSource(audioElement);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.78;
  source.connect(analyser);
  analyser.connect(context.destination);

  const bins = new Uint8Array(analyser.frequencyBinCount);
  let previousRms = 0;

  function averageRange(startFraction, endFraction) {
    const start = Math.floor(bins.length * startFraction);
    const end = Math.max(start + 1, Math.floor(bins.length * endFraction));
    let total = 0;
    for (let i = start; i < end; i++) total += bins[i];
    return total / ((end - start) * 255);
  }

  return {
    kind: 'media',
    async resume() {
      if (context.state !== 'running') {
        await context.resume();
      }
    },
    sample() {
      analyser.getByteFrequencyData(bins);
      const bass = averageRange(0.0, 0.08);
      const mid = averageRange(0.08, 0.32);
      const high = averageRange(0.32, 0.72);
      let sumSquares = 0;
      for (let i = 0; i < bins.length; i++) {
        const v = bins[i] / 255;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / bins.length);
      const onset = Math.max(0, rms - previousRms) * 4;
      previousRms = rms;
      return { bass, mid, high, rms, onset: Math.min(1, onset) };
    },
    setMuted(muted) { audioElement.muted = muted; },
    async dispose() { await context.close(); },
    context
  };
}

export async function createProceduralAudioAnalyser() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API is unavailable.');
  const context = new AudioContextClass();
  const analyserNode = context.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.82;
  const master = context.createGain();
  master.gain.value = 0.12;
  const frequencies = [55, 82.41, 110, 164.81];
  const voices = frequencies.map((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index % 2 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.16 / (index + 1);
    oscillator.connect(gain).connect(master);
    oscillator.start();
    return oscillator;
  });
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.frequency.value = 0.075;
  lfoGain.gain.value = 0.035;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();
  master.connect(analyserNode).connect(context.destination);
  const bins = new Uint8Array(analyserNode.frequencyBinCount);
  let previousRms = 0;
  const averageRange = (startFraction, endFraction) => {
    const start = Math.floor(bins.length * startFraction);
    const end = Math.max(start + 1, Math.floor(bins.length * endFraction));
    let total = 0;
    for (let i = start; i < end; i += 1) total += bins[i];
    return total / ((end - start) * 255);
  };
  return {
    kind: 'procedural',
    async resume() { if (context.state !== 'running') await context.resume(); },
    async suspend() { if (context.state === 'running') await context.suspend(); },
    setMuted(muted) { master.gain.setTargetAtTime(muted ? 0 : 0.12, context.currentTime, 0.04); },
    sample() {
      analyserNode.getByteFrequencyData(bins);
      const bass = averageRange(0, .08), mid = averageRange(.08, .32), high = averageRange(.32, .72);
      let sum = 0; for (const value of bins) sum += (value / 255) ** 2;
      const rms = Math.sqrt(sum / bins.length), onset = Math.min(1, Math.max(0, rms - previousRms) * 4);
      previousRms = rms;
      return { bass, mid, high, rms, onset };
    },
    async dispose() { voices.forEach((voice) => voice.stop()); lfo.stop(); await context.close(); },
    context
  };
}
