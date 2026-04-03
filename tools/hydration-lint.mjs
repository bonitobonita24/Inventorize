#!/usr/bin/env node
// tools/hydration-lint.mjs
// Checks for common SSR hydration mismatch patterns in Next.js components
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const appsDir = resolve(root, 'apps');

const HYDRATION_PATTERNS = [
  { pattern: /typeof\s+window\s*(!==?|===?)\s*['"]undefined['"]/, message: 'Direct window check causes hydration mismatch — use useEffect or dynamic import' },
  { pattern: /Date\.now\(\)/, message: 'Date.now() differs between server and client — use useEffect for timestamps' },
  { pattern: /Math\.random\(\)/, message: 'Math.random() produces different values on server vs client' },
  { pattern: /localStorage\b/, message: 'localStorage is not available on server — guard with useEffect' },
  { pattern: /sessionStorage\b/, message: 'sessionStorage is not available on server — guard with useEffect' },
  { pattern: /navigator\b(?!\.*)/, message: 'navigator is not available on server — guard with useEffect' },
];

function walkDir(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (['.tsx', '.ts', '.jsx'].includes(extname(fullPath))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible dirs
  }
  return files;
}

let issueCount = 0;

const files = walkDir(appsDir);
for (const file of files) {
  // Skip server-side files
  if (file.includes('/server/') || file.includes('/api/') || file.includes('middleware')) continue;

  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (const { pattern, message } of HYDRATION_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        // Check if inside useEffect — simple heuristic
        const prevLines = lines.slice(Math.max(0, i - 5), i).join('\n');
        if (prevLines.includes('useEffect')) continue;

        const relPath = file.replace(root + '/', '');
        console.warn(`⚠ ${relPath}:${i + 1} — ${message}`);
        issueCount++;
      }
    }
  }
}

if (issueCount === 0) {
  console.log('✅ Hydration lint passed — no SSR mismatch patterns found');
} else {
  console.warn(`⚠ Hydration lint found ${issueCount} potential issue(s) — review above`);
}

// Exit 0 — warnings only, not blocking
process.exit(0);
