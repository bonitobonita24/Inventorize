#!/usr/bin/env node
// tools/check-product-sync.mjs
// Validates PRODUCT.md ↔ inputs.yml alignment + private tag leakage check (Rule 20)
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

try {
  const productPath = resolve(root, 'docs/PRODUCT.md');
  const inputsPath = resolve(root, 'inputs.yml');

  if (!existsSync(productPath)) {
    console.error('❌ docs/PRODUCT.md not found');
    process.exit(1);
  }
  if (!existsSync(inputsPath)) {
    console.error('❌ inputs.yml not found');
    process.exit(1);
  }

  const product = readFileSync(productPath, 'utf-8');
  const inputs = readFileSync(inputsPath, 'utf-8');

  // Extract private tag content
  const privatePattern = /<private>([\s\S]*?)<\/private>/gi;
  const privateBlocks = [];
  let match;
  while ((match = privatePattern.exec(product)) !== null) {
    privateBlocks.push(match[1].trim());
  }

  // Check governance docs for private tag leakage
  const governanceDocs = [
    'docs/CHANGELOG_AI.md',
    'docs/DECISIONS_LOG.md',
    'docs/IMPLEMENTATION_MAP.md',
    'project.memory.md',
  ];

  let leaked = false;
  for (const docRelPath of governanceDocs) {
    const docPath = resolve(root, docRelPath);
    if (!existsSync(docPath)) continue;
    const docContent = readFileSync(docPath, 'utf-8');

    for (const block of privateBlocks) {
      // Check for substantial substrings (> 5 chars) of private content
      const words = block.split(/\s+/).filter((w) => w.length > 5);
      for (const word of words) {
        if (docContent.includes(word)) {
          console.error(`❌ Private tag content leaked into ${docRelPath}: "${word}"`);
          leaked = true;
        }
      }
    }
  }

  if (leaked) {
    console.error('❌ Private tag leakage detected — remove sensitive content from governance docs');
    process.exit(1);
  }

  // Basic sync check: app name should match
  if (inputs.includes('name: Inventorize') && product.includes('Inventorize')) {
    console.log('✅ PRODUCT.md ↔ inputs.yml sync check passed');
  } else {
    console.error('❌ App name mismatch between PRODUCT.md and inputs.yml');
    process.exit(1);
  }

  if (privateBlocks.length > 0) {
    console.log(`✅ Private tag check passed — ${privateBlocks.length} block(s) verified not leaked`);
  }

  process.exit(0);
} catch (err) {
  console.error(`❌ Sync check error: ${err.message}`);
  process.exit(1);
}
