#!/usr/bin/env node
// Calls the deterministic renderAt() for every export frame and screenshots the
// canvas to a PNG sequence. This is the reproducible master render path — see
// "Deterministic exports" in the project spec. Pin the Playwright/Chromium version
// through package-lock.json so a render six months from now uses the same engine.

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { loadJSON } from './lib/ids.mjs';

function parseArgs(argv) {
  const args = { fps: 30, width: 1080, height: 1920 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
    if (argv[i] === '--features') args.features = argv[++i];
    if (argv[i] === '--out') args.out = argv[++i];
    if (argv[i] === '--fps') args.fps = Number(argv[++i]);
    if (argv[i] === '--width') args.width = Number(argv[++i]);
    if (argv[i] === '--height') args.height = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !args.features || !args.out) {
    throw new Error('Usage: render-frames.mjs --url <http://localhost:...> --features <features.json> --out <dir> [--fps 30] [--width 1080] [--height 1920]');
  }

  const featureData = await loadJSON(args.features, null);
  if (!featureData) throw new Error(`Could not read audio features from ${args.features}`);

  await mkdir(args.out, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: args.width, height: args.height },
    deviceScaleFactor: 1
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(`[render-frames] page console error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.error(`[render-frames] uncaught page error: ${err.message}`));

  await page.goto(args.url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.renderAt === 'function', { timeout: 15000 });

  const canvas = page.locator('#stage');

  for (const frame of featureData.frames) {
    await page.evaluate(
      ({ time, audio }) => window.renderAt(time, audio),
      { time: frame.time, audio: { bass: frame.bass, mid: frame.mid, high: frame.high, onset: frame.onset, rms: frame.rms } }
    );
    const framePath = path.join(args.out, `frame-${String(frame.frame).padStart(5, '0')}.png`);
    await canvas.screenshot({ path: framePath });
  }

  await browser.close();
  console.log(`[render-frames] wrote ${featureData.frames.length} frames to ${args.out}`);
}

main().catch((error) => {
  console.error('[render-frames] fatal:', error);
  process.exitCode = 1;
});
