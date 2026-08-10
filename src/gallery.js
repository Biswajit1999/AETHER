// Gallery UI for browsing accepted animations once the catalogue grows beyond one
// piece. Not wired into index.html yet — the current baseline loads a single
// animation directly from main.js. Extend this once src/animations/ has multiple
// published entries.

import { loadManifest } from './manifest.js';

export async function renderGallery(container) {
  const manifest = await loadManifest();
  container.innerHTML = '';
  for (const entry of manifest.animations ?? []) {
    const link = document.createElement('a');
    link.href = `#${entry.id}`;
    link.textContent = entry.title ?? entry.id;
    container.appendChild(link);
  }
}
