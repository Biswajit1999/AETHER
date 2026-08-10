// Shared identity, retry and manifest-tracking helpers used by both generator scripts.
// See "Idempotency and crash recovery" in the project spec.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildId({ date, provider, slot, concept }) {
  const slotStr = String(slot).padStart(2, '0');
  return `${date}-${provider}-${slotStr}-${concept}`;
}

export function buildSeed({ date, provider, slot, concept }) {
  const slotStr = String(slot).padStart(2, '0');
  return `${date.replace(/-/g, '')}-${provider}-${slotStr}-${concept}`;
}

export async function loadJSON(filePath, fallback) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function saveJSON(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

export function isTransient(error) {
  if (error && typeof error.status === 'number') {
    return RETRYABLE_STATUS.has(error.status);
  }
  return error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET' || error?.name === 'AbortError';
}

export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 2000, maxDelayMs = 60000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === maxAttempts - 1) throw error;
      const retryAfterMs = error?.retryAfterMs;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const wait = retryAfterMs ?? backoff + Math.random() * 1000;
      await sleep(wait);
    }
  }
  throw lastError;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}
