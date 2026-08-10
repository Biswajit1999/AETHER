#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ANIMATIONS_ROOT = path.join(REPO_ROOT, 'src', 'animations');
const PUBLIC_MANIFEST = path.join(REPO_ROOT, 'public', 'manifest.json');
const REPORT_JSON = path.join(REPO_ROOT, 'public', 'study-contract-report.json');
const REPORT_MD = path.join(REPO_ROOT, 'STUDY_ATLAS.md');

const ALLOWED_CLASSIFICATIONS = new Set([
  'MATHEMATICALLY_INSPIRED',
  'SPECULATIVE_ARTISTIC',
  'PHYSICS_MODEL',
  'PHYSICALLY_MODELLED',
]);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function addCounter(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

async function collectStudies() {
  const studies = [];
  const dateDirs = await readdir(ANIMATIONS_ROOT, { withFileTypes: true });
  for (const dateDir of dateDirs) {
    if (!dateDir.isDirectory()) continue;
    const datePath = path.join(ANIMATIONS_ROOT, dateDir.name);
    const idDirs = await readdir(datePath, { withFileTypes: true });
    for (const idDir of idDirs) {
      if (!idDir.isDirectory()) continue;
      const studyPath = path.join(datePath, idDir.name);
      const metaPath = path.join(studyPath, 'meta.json');
      if (!(await exists(metaPath))) continue;
      const meta = JSON.parse(await readFile(metaPath, 'utf8'));
      const files = await readdir(studyPath);
      studies.push({
        date: dateDir.name,
        directory: idDir.name,
        path: path.relative(REPO_ROOT, studyPath).replaceAll('\\', '/'),
        metaPath: path.relative(REPO_ROOT, metaPath).replaceAll('\\', '/'),
        files,
        meta,
      });
    }
  }
  studies.sort((a, b) => {
    const ao = Number(/^a(\d+)/.exec(a.directory)?.[1] ?? 9999);
    const bo = Number(/^a(\d+)/.exec(b.directory)?.[1] ?? 9999);
    return ao - bo || a.directory.localeCompare(b.directory);
  });
  return studies;
}

function validateStudy(study) {
  const errors = [];
  const warnings = [];
  const { meta, files } = study;

  for (const field of ['id', 'slug', 'seed', 'title', 'classification', 'duration']) {
    if (meta[field] === undefined || meta[field] === null || String(meta[field]).trim() === '') {
      errors.push(`missing ${field}`);
    }
  }

  if (!ALLOWED_CLASSIFICATIONS.has(meta.classification)) {
    errors.push(`invalid classification ${meta.classification}`);
  }

  if (!files.includes('animation.js')) errors.push('missing animation.js');
  if (files.includes('vertex.glsl') !== files.includes('fragment.glsl')) {
    errors.push('shader pair must include both vertex.glsl and fragment.glsl');
  }

  const duration = Number(meta.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 180) {
    errors.push('duration must be a finite positive number no larger than 180 seconds');
  }

  if (!Array.isArray(meta.tags) || meta.tags.length < 1) {
    warnings.push('tags should contain at least one catalogue tag');
  }
  if (!meta.description && meta.classification === 'PHYSICS_MODEL') {
    errors.push('physics model requires a description');
  }
  if (meta.classification === 'PHYSICS_MODEL') {
    if (!meta.physics || typeof meta.physics !== 'object') errors.push('physics model requires physics metadata');
    if (!Array.isArray(meta.references) || meta.references.length < 1) errors.push('physics model requires references');
  }
  if (meta.classification === 'PHYSICALLY_MODELLED' && !meta.fingerprint) {
    warnings.push('physically modelled study should expose a fingerprint');
  }

  return { errors, warnings };
}

function atlasMarkdown(report) {
  const lines = [
    '# AETHER Study Atlas',
    '',
    `Generated UTC: ${report.generatedAt}`,
    '',
    'This atlas is a machine-generated contract summary for the published AETHER studies. It distinguishes mathematically inspired work, physically modelled studies, speculative visual art, and full physics models.',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Published studies | ${report.summary.studies} |`,
    `| Shader-backed studies | ${report.summary.shaderBacked} |`,
    `| Contract errors | ${report.summary.errors} |`,
    `| Contract warnings | ${report.summary.warnings} |`,
    '',
    '## Classification Coverage',
    '',
    '| Classification | Studies |',
    '| --- | ---: |',
  ];

  for (const [classification, count] of Object.entries(report.byClassification)) {
    lines.push(`| ${classification} | ${count} |`);
  }

  lines.push('', '## Published Studies', '');
  for (const study of report.studies) {
    lines.push(
      `- **${study.orderLabel}** ${study.title} - ${study.classification} - ` +
      `\`${study.path}\` - ${study.tags.join(', ') || 'untagged'}`
    );
  }

  lines.push('', 'Full validation details are stored in [`public/study-contract-report.json`](public/study-contract-report.json).', '');
  return lines.join('\n');
}

async function main() {
  const studies = await collectStudies();
  const manifest = JSON.parse(await readFile(PUBLIC_MANIFEST, 'utf8'));
  const errors = [];
  const warnings = [];
  const slugs = new Map();
  const seeds = new Map();
  const ids = new Map();
  const byClassification = new Map();

  const records = [];
  for (const study of studies) {
    const order = Number(/^a(\d+)/.exec(study.directory)?.[1] ?? 9999);
    const validation = validateStudy(study);
    for (const field of ['slug', 'seed', 'id']) {
      const map = field === 'slug' ? slugs : field === 'seed' ? seeds : ids;
      const value = study.meta[field];
      if (!value) continue;
      if (map.has(value)) errors.push(`${study.path}: duplicate ${field} ${value}`);
      map.set(value, study.path);
    }
    for (const error of validation.errors) errors.push(`${study.path}: ${error}`);
    for (const warning of validation.warnings) warnings.push(`${study.path}: ${warning}`);
    addCounter(byClassification, study.meta.classification || 'UNCLASSIFIED');

    const animationPath = path.join(REPO_ROOT, study.path, 'animation.js');
    records.push({
      order,
      orderLabel: `A${String(order).padStart(3, '0')}`,
      id: study.meta.id,
      slug: study.meta.slug,
      seed: study.meta.seed,
      title: study.meta.title,
      date: study.date,
      classification: study.meta.classification,
      duration: Number(study.meta.duration),
      tags: Array.isArray(study.meta.tags) ? study.meta.tags : [],
      path: study.path,
      hasShaders: study.files.includes('vertex.glsl') && study.files.includes('fragment.glsl'),
      hasPhysicsMetadata: Boolean(study.meta.physics),
      hasReferences: Array.isArray(study.meta.references) && study.meta.references.length > 0,
      animationSha256: await sha256(animationPath),
      metaSha256: await sha256(path.join(REPO_ROOT, study.metaPath)),
      warnings: validation.warnings,
    });
  }

  if (manifest.count !== studies.length || manifest.animations?.length !== studies.length) {
    errors.push(`public/manifest.json is stale: manifest count ${manifest.count}, source studies ${studies.length}`);
  }

  const report = {
    schema: 'aether-study-contract-report-v1',
    generatedAt: new Date().toISOString(),
    summary: {
      studies: studies.length,
      shaderBacked: records.filter((record) => record.hasShaders).length,
      errors: errors.length,
      warnings: warnings.length,
    },
    byClassification: Object.fromEntries([...byClassification.entries()].sort()),
    errors,
    warnings,
    studies: records,
  };

  await writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(REPORT_MD, `${atlasMarkdown(report)}\n`);

  if (errors.length) {
    console.error(`Study contract validation failed with ${errors.length} error(s).`);
    for (const error of errors.slice(0, 20)) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Study contract validation: PASS (${studies.length} studies, ${warnings.length} warning(s))`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

