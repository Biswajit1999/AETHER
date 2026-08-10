#!/usr/bin/env node
// Assembles a PNG frame sequence + audio track into the canonical H.264/AAC MP4
// Reel export via ffmpeg. See the canonical export profile in the project spec:
// 1080x1920, 30 FPS, yuv420p, AAC audio.

import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = { fps: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--frames') args.frames = argv[++i];
    if (argv[i] === '--audio') args.audio = argv[++i];
    if (argv[i] === '--out') args.out = argv[++i];
    if (argv[i] === '--fps') args.fps = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.frames || !args.audio || !args.out) {
    throw new Error('Usage: render-reel.mjs --frames <dir/frame-%05d.png> --audio <track.wav> --out <reel.mp4> [--fps 30]');
  }

  await mkdir(path.dirname(args.out), { recursive: true });

  const ffmpegArgs = [
    '-y',
    '-framerate', String(args.fps),
    '-i', args.frames,
    '-i', args.audio,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(args.fps),
    '-c:a', 'aac',
    '-shortest',
    args.out
  ];

  console.log(`[render-reel] ffmpeg ${ffmpegArgs.join(' ')}`);
  const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

  if (result.error) {
    throw new Error(`ffmpeg could not be launched: ${result.error.message}. Is ffmpeg installed and on PATH?`);
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${result.status}`);
  }

  console.log(`[render-reel] wrote ${args.out}`);
}

main().catch((error) => {
  console.error('[render-reel] fatal:', error);
  process.exitCode = 1;
});
