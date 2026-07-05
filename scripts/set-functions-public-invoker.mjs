#!/usr/bin/env node
/**
 * Gen 2 Cloud Functions run on Cloud Run. Callable/web clients need
 * roles/run.invoker for allUsers so browser CORS preflight (OPTIONS) succeeds.
 *
 * Usage:
 *   node scripts/set-functions-public-invoker.mjs
 *   node scripts/set-functions-public-invoker.mjs --project campusflow-f798c
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const project =
  projectIdx !== -1 ? args[projectIdx + 1] : process.env.GCLOUD_PROJECT ?? 'campusflow-f798c';
const region = 'asia-south1';

const services = [
  'provisionuser',
  'healthcheck',
  'submitodrequest',
  'approveodrequest',
  'rejectodrequest',
  'requestodchanges',
  'revokeodpass',
  'getodpassqrpayload',
  'registerdevicetoken',
  'marknotificationread',
  'verifyodpass',
];

function run(command, commandArgs) {
  console.log(`> ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: true, cwd: root });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Setting public invoker on Cloud Run services (project=${project}, region=${region})`);

for (const service of services) {
  run('gcloud', [
    'run',
    'services',
    'add-iam-policy-binding',
    service,
    `--project=${project}`,
    `--region=${region}`,
    '--member=allUsers',
    '--role=roles/run.invoker',
    '--quiet',
  ]);
}

console.log('Done.');
