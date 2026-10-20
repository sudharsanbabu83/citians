#!/usr/bin/env node
/**
 * Firebase deploy bundles packages/functions in isolation. Keep vendor/shared
 * in sync with packages/shared so Cloud Functions get the latest schemas.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const functionsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = resolve(functionsRoot, '../shared');
const vendorRoot = resolve(functionsRoot, 'vendor/shared');

if (!existsSync(resolve(sharedRoot, 'dist/index.js'))) {
  console.error('packages/shared/dist is missing. Run: npm run build:shared');
  process.exit(1);
}

rmSync(vendorRoot, { recursive: true, force: true });
mkdirSync(vendorRoot, { recursive: true });

for (const item of ['dist', 'package.json']) {
  cpSync(resolve(sharedRoot, item), resolve(vendorRoot, item), { recursive: true });
}

console.log('Synced packages/shared → packages/functions/vendor/shared');
