#!/usr/bin/env node
// Validates news.json before the news workflow commits it. Zero dependencies.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'news.json');

const ALLOWED_LANGS = ['de', 'en'];
const ALLOWED_TOPICS = ['general', 'tech'];
const errors = [];

let data;
try {
  data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error(`✗ news.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (!data || typeof data !== 'object' || Array.isArray(data)) {
  console.error('✗ news.json must be an object { generatedAt, items }.');
  process.exit(1);
}
if (typeof data.generatedAt !== 'string' || Number.isNaN(Date.parse(data.generatedAt))) {
  errors.push('generatedAt must be a valid ISO timestamp.');
}
if (!Array.isArray(data.items) || data.items.length === 0) {
  errors.push('items must be a non-empty array.');
}

const seenIds = new Set();
(data.items || []).forEach((item, i) => {
  const where = `item at index ${i} (id: ${item && item.id})`;
  if (typeof item.id !== 'string' || !item.id.trim()) errors.push(`${where}: "id" must be a non-empty string.`);
  else if (seenIds.has(item.id)) errors.push(`${where}: duplicate id.`);
  else seenIds.add(item.id);
  if (item.type !== 'news') errors.push(`${where}: "type" must be "news".`);
  if (!ALLOWED_TOPICS.includes(item.topic)) errors.push(`${where}: topic must be one of ${ALLOWED_TOPICS.join(', ')}.`);
  if (!ALLOWED_LANGS.includes(item.lang)) errors.push(`${where}: lang must be one of ${ALLOWED_LANGS.join(', ')}.`);
  if (typeof item.headline !== 'string' || !item.headline.trim()) errors.push(`${where}: headline must be non-empty.`);
  try {
    const url = new URL(item.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
  } catch {
    errors.push(`${where}: url must be a valid HTTP(S) URL.`);
  }
  if (typeof item.publishedAt !== 'string' || Number.isNaN(Date.parse(item.publishedAt))) {
    errors.push(`${where}: publishedAt must be a valid ISO timestamp.`);
  }
});

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s) found in news.json:\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

const byBucket = {};
data.items.forEach((it) => {
  const key = `${it.lang}/${it.topic}`;
  byBucket[key] = (byBucket[key] || 0) + 1;
});
console.log(`✓ news.json is valid — ${data.items.length} items, generated ${data.generatedAt}.`);
Object.entries(byBucket).sort().forEach(([bucket, count]) => console.log(`  ${bucket.padEnd(12)} ${count}`));
