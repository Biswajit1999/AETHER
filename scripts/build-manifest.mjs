#!/usr/bin/env node
// Scans src/animations/<date>/<id>/meta.json for every manually accepted animation
// and builds public/manifest.json, consumed by src/gallery.js. Only ever reads from
// src/animations/ — the directory a human has already copied approved work into.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { saveJSON } from './lib/ids.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ANIMATIONS_ROOT = path.join(REPO_ROOT, 'src/animations');

async function dirExists(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

function humanise(value = '') {
  return String(value).replaceAll('-', ' ').replaceAll('_', ' ');
}

function catalogueDescription(meta) {
  if (meta.description) return meta.description;
  const topology = humanise(meta.fingerprint?.topology || meta.tags?.[0] || 'computational structure');
  const dynamics = humanise(meta.fingerprint?.dynamics || 'time evolving motion');
  return `${meta.title} visualises ${topology}. Its animation is organised around ${dynamics}, with interactive camera, colour and audio response controls.`;
}

async function main() {
  const animations = [];

  if (await dirExists(ANIMATIONS_ROOT)) {
    const dateDirs = await readdir(ANIMATIONS_ROOT, { withFileTypes: true });
    for (const dateDir of dateDirs) {
      if (!dateDir.isDirectory()) continue;
      const datePath = path.join(ANIMATIONS_ROOT, dateDir.name);
      const idDirs = await readdir(datePath, { withFileTypes: true });
      for (const idDir of idDirs) {
        if (!idDir.isDirectory()) continue;
        const metaPath = path.join(datePath, idDir.name, 'meta.json');
        try {
          const meta = JSON.parse(await readFile(metaPath, 'utf8'));
          animations.push({
            order: Number(/^a(\d+)/.exec(idDir.name)?.[1] ?? 9999),
            id: meta.id ?? idDir.name,
            slug: meta.slug ?? idDir.name,
            seed: meta.seed ?? meta.id ?? idDir.name,
            title: meta.title ?? idDir.name,
            date: dateDir.name,
            classification: meta.classification,
            description: catalogueDescription(meta),
            ...(meta.equation ? { equation: meta.equation } : {}),
            ...(meta.numerics ? { numerics: meta.numerics } : {}),
            ...(meta.physics ? { physics: meta.physics } : {}),
            ...(meta.references?.length ? { references: meta.references } : {}),
            ...(meta.fingerprint ? { visual: meta.fingerprint } : {}),
            tags: meta.tags ?? [],
            duration: meta.duration,
            path: `src/animations/${dateDir.name}/${idDir.name}`
          });
        } catch {
          console.warn(`[manifest] skipping ${metaPath} — missing or invalid meta.json`);
        }
      }
    }
  }

  animations.sort((a, b) => a.order - b.order);

  await saveJSON(path.join(REPO_ROOT, 'public/manifest.json'), {
    generatedAt: new Date().toISOString(),
    count: animations.length,
    animations
  });

  console.log(`[manifest] wrote public/manifest.json with ${animations.length} published animation(s).`);
}

main().catch((error) => {
  console.error('[manifest] fatal:', error);
  process.exitCode = 1;
});
