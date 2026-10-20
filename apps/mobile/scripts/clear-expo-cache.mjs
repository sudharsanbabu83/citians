#!/usr/bin/env node
/**
 * Clears corrupted Expo CLI API caches (fixes "Body is unusable" on start).
 */
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cacheRoot = path.join(os.homedir(), '.expo');
const cacheDirs = ['native-modules-cache', 'schema-cache', 'versions-cache'];

for (const dir of cacheDirs) {
  const target = path.join(cacheRoot, dir);
  try {
    rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${target}`);
  } catch (error) {
    console.warn(`Could not remove ${target}:`, error);
  }
}

console.log('Expo cache cleared. Run npm run dev:mobile again.');
