/**
 * Runs security rules tests from packages/rules-tests.
 * Invoked by: firebase emulators:exec ... -- node scripts/run-rules-tests.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesTestsDir = resolve(root, 'packages', 'rules-tests');

const result = spawnSync('npm', ['test'], {
  cwd: rulesTestsDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
