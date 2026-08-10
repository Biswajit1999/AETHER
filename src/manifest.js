// Loads public/manifest.json (built by scripts/build-manifest.mjs) describing the
// published animation catalogue. Consumed by the future gallery UI once more than
// one accepted animation exists in src/animations/.

export async function loadManifest() {
  const response = await fetch('./manifest.json');
  if (!response.ok) throw new Error(`Failed to load manifest.json: ${response.status}`);
  return response.json();
}
