#!/usr/bin/env node
// Validates facts.json before every deploy. Zero dependencies — run with `node validate-facts.js`.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALLOWED_CATEGORIES = [
  'science', 'history', 'nature', 'space', 'animals',
  'geography', 'technology', 'psychology', 'food', 'curiosities',
];
const ALLOWED_LANGS = ['de', 'en'];

const filePath = path.join(__dirname, 'facts.json');
const errors = [];

let facts;
try {
  facts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error(`✗ facts.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(facts)) {
  console.error('✗ facts.json must be a flat JSON array.');
  process.exit(1);
}

const seenIds = new Set();
facts.forEach((fact, i) => {
  const where = `fact at index ${i} (id: ${fact && fact.id})`;

  if (typeof fact.id !== 'number' || !Number.isInteger(fact.id)) {
    errors.push(`${where}: "id" must be an integer.`);
  } else if (seenIds.has(fact.id)) {
    errors.push(`${where}: duplicate id ${fact.id}.`);
  } else {
    seenIds.add(fact.id);
  }

  if (!ALLOWED_CATEGORIES.includes(fact.category)) {
    errors.push(`${where}: category "${fact.category}" is not in the allowed list (${ALLOWED_CATEGORIES.join(', ')}).`);
  }

  if (!ALLOWED_LANGS.includes(fact.lang)) {
    errors.push(`${where}: lang "${fact.lang}" must be one of ${ALLOWED_LANGS.join(', ')}.`);
  }

  if (typeof fact.text !== 'string' || fact.text.trim().length === 0) {
    errors.push(`${where}: "text" must be a non-empty string.`);
  }

  if (!Array.isArray(fact.tags) || fact.tags.length < 1 || fact.tags.length > 3) {
    errors.push(`${where}: "tags" must be an array of 1-3 entries.`);
  } else {
    fact.tags.forEach((tag) => {
      if (typeof tag !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag)) {
        errors.push(`${where}: tag "${tag}" must be lowercase ASCII, hyphen-separated (e.g. "ancient-rome").`);
      }
    });
    if (new Set(fact.tags).size !== fact.tags.length) {
      errors.push(`${where}: duplicate tags within one fact.`);
    }
  }
});

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s) found in facts.json:\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

const byCategory = {};
const byLang = {};
const byTag = {};
facts.forEach((f) => {
  byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  byLang[f.lang] = (byLang[f.lang] || 0) + 1;
  (f.tags || []).forEach((tag) => {
    byTag[tag] = (byTag[tag] || 0) + 1;
  });
});

console.log(`✓ facts.json is valid — ${facts.length} facts, ${seenIds.size} unique ids.\n`);
console.log('By category:');
Object.entries(byCategory).sort().forEach(([cat, count]) => console.log(`  ${cat.padEnd(12)} ${count}`));
console.log('\nBy language:');
Object.entries(byLang).sort().forEach(([lang, count]) => console.log(`  ${lang.padEnd(12)} ${count}`));
console.log(`\nBy tag (${Object.keys(byTag).length} distinct):`);
Object.entries(byTag).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => console.log(`  ${tag.padEnd(20)} ${count}`));

const singletons = Object.entries(byTag).filter(([, count]) => count === 1).map(([tag]) => tag);
if (singletons.length > 0) {
  console.log(`\n⚠ Tags used by only one fact (possible typo/synonym — prefer reusing an existing tag):`);
  console.log(`  ${singletons.sort().join(', ')}`);
}

console.log(`\nNext free id: ${Math.max(...facts.map((f) => f.id)) + 1}`);
