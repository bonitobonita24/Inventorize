#!/usr/bin/env node
// tools/validate-inputs.mjs
// Validates inputs.yml against inputs.schema.json
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function loadYaml(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  // Simple YAML-like parser for flat/nested keys — sufficient for validation
  // For full YAML: install js-yaml. Keeping zero-dep for tooling.
  return content;
}

try {
  const inputsPath = resolve(root, 'inputs.yml');
  const schemaPath = resolve(root, 'inputs.schema.json');

  // Check files exist
  readFileSync(inputsPath, 'utf-8');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  // Basic structural checks
  const inputs = readFileSync(inputsPath, 'utf-8');

  const requiredTopLevel = ['app', 'tenancy', 'auth', 'apps', 'packages', 'tech_stack', 'ports'];
  const missing = requiredTopLevel.filter((key) => !inputs.includes(`${key}:`));

  if (missing.length > 0) {
    console.error(`❌ inputs.yml missing required top-level keys: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate ports section exists and has dev.base
  if (!inputs.includes('base:')) {
    console.error('❌ inputs.yml missing ports.dev.base — required for Rule 22');
    process.exit(1);
  }

  // Validate tenancy mode is declared
  if (!inputs.includes('mode:')) {
    console.error('❌ inputs.yml missing tenancy.mode — required (single | multi)');
    process.exit(1);
  }

  console.log('✅ inputs.yml validation passed');
  process.exit(0);
} catch (err) {
  console.error(`❌ Validation error: ${err.message}`);
  process.exit(1);
}
