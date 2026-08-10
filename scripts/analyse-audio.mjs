#!/usr/bin/env node
// Offline audio analysis: audio file -> public/audio-features/<id>.json
// One entry per export frame (fixed 30 FPS canonical rate) so that, e.g., frame 327
// always receives exactly the same bass/mid/treble values — see "Deterministic
// exports" in the project spec. This mirrors the browser AnalyserNode band split
// (bass 0-precisely-defined Hz, mid, high) but uses explicit Hz boundaries computed
// from sampleRate, which stays consistent across FFT sizes (unlike fractional bins).

import path from 'node:path';
import { readWav } from './lib/wav.mjs';
import { fft, nextPowerOfTwo } from './lib/fft.mjs';
import { saveJSON } from './lib/ids.mjs';

const FPS = 30;
const FFT_SIZE = 2048;
const BAND_HZ = { bass: [20, 250], mid: [250, 2000], high: [2000, 8000] };

function parseArgs(argv) {
  const args = { fps: FPS, duration: 15 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--in') args.in = argv[++i];
    if (argv[i] === '--out') args.out = argv[++i];
    if (argv[i] === '--fps') args.fps = Number(argv[++i]);
    if (argv[i] === '--duration') args.duration = Number(argv[++i]);
  }
  return args;
}

function hannWindow(size) {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  return w;
}

function bandAverage(magnitudes, sampleRate, fftSize, loHz, hiHz) {
  const binHz = sampleRate / fftSize;
  const startBin = Math.max(0, Math.floor(loHz / binHz));
  const endBin = Math.min(magnitudes.length - 1, Math.ceil(hiHz / binHz));
  let sum = 0;
  let count = 0;
  for (let i = startBin; i <= endBin; i++) {
    sum += magnitudes[i];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) {
    throw new Error('Usage: analyse-audio.mjs --in <file.wav> --out <features.json> [--fps 30] [--duration 15]');
  }

  const { sampleRate, samples } = await readWav(args.in);
  const window = hannWindow(FFT_SIZE);
  const paddedSize = nextPowerOfTwo(FFT_SIZE);
  const hop = sampleRate / args.fps;
  const frameCount = Math.round(args.duration * args.fps);

  let maxMagnitudeSeen = 1e-6; // running normaliser so bass/mid/high stay in ~0..1
  const frames = [];
  let previousRms = 0;

  for (let frame = 0; frame < frameCount; frame++) {
    const centreSample = Math.round(frame * hop);
    const startSample = centreSample - Math.floor(FFT_SIZE / 2);

    const real = new Float32Array(paddedSize);
    const imag = new Float32Array(paddedSize);
    let sumSquares = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const sampleIndex = startSample + i;
      const sample = sampleIndex >= 0 && sampleIndex < samples.length ? samples[sampleIndex] : 0;
      real[i] = sample * window[i];
      sumSquares += sample * sample;
    }

    fft(real, imag);
    const magnitudes = new Float32Array(paddedSize / 2);
    for (let i = 0; i < magnitudes.length; i++) {
      magnitudes[i] = Math.hypot(real[i], imag[i]);
      if (magnitudes[i] > maxMagnitudeSeen) maxMagnitudeSeen = magnitudes[i];
    }

    const bass = bandAverage(magnitudes, sampleRate, paddedSize, ...BAND_HZ.bass);
    const mid = bandAverage(magnitudes, sampleRate, paddedSize, ...BAND_HZ.mid);
    const high = bandAverage(magnitudes, sampleRate, paddedSize, ...BAND_HZ.high);
    const rms = Math.sqrt(sumSquares / FFT_SIZE);

    frames.push({ frame, bass, mid, high, rms, previousRms });
    previousRms = rms;
  }

  // Normalise magnitude-derived bands to ~0..1 using the run's own peak, and derive
  // onset from the frame-to-frame RMS delta now that the full pass is complete.
  let prevRmsForOnset = 0;
  const normalised = frames.map((f) => {
    const onset = Math.min(1, Math.max(0, (f.rms - prevRmsForOnset) * 4));
    prevRmsForOnset = f.rms;
    return {
      frame: f.frame,
      time: f.frame / args.fps,
      bass: Math.min(1, f.bass / maxMagnitudeSeen),
      mid: Math.min(1, f.mid / maxMagnitudeSeen),
      high: Math.min(1, f.high / maxMagnitudeSeen),
      rms: Math.min(1, f.rms),
      onset
    };
  });

  await saveJSON(args.out, {
    source: path.basename(args.in),
    sampleRate,
    fps: args.fps,
    frameCount,
    frames: normalised
  });

  console.log(`[analyse-audio] wrote ${frameCount} frames to ${args.out}`);
}

main().catch((error) => {
  console.error('[analyse-audio] fatal:', error);
  process.exitCode = 1;
});
