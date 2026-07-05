#!/usr/bin/env node
/**
 * CampusFlow deployment orchestrator.
 *
 * Usage:
 *   node scripts/deploy.mjs                    # deploy to dev (default)
 *   node scripts/deploy.mjs --project prod     # deploy to production
 *   node scripts/deploy.mjs --only hosting     # partial deploy
 *   node scripts/deploy.mjs --skip-build       # deploy without rebuilding
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const projectArg = readFlag(args, '--project') ?? 'dev';
const onlyArg = readFlag(args, '--only') ?? 'hosting,functions,firestore,storage';
const skipBuild = args.includes('--skip-build');

const projectAlias = projectArg === 'prod' ? 'prod' : 'dev';
const isProd = projectAlias === 'prod';

function readFlag(argv, flag) {
  const idx = argv.indexOf(flag);
  if (idx === -1) return null;
  return argv[idx + 1] ?? null;
}

function run(command, commandArgs, options = {}) {
  console.log(`\n> ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: true,
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function warnProdEnv() {
  const prodEnvPath = resolve(root, 'apps/admin/.env.production');
  const examplePath = resolve(root, 'apps/admin/.env.production.example');

  if (!existsSync(prodEnvPath)) {
    console.warn('\n⚠  apps/admin/.env.production not found.');
    console.warn(`   Copy ${examplePath} → apps/admin/.env.production and set production Firebase config.`);
    console.warn('   Vite uses .env.production when NODE_ENV=production during build.\n');
  } else {
    const contents = readFileSync(prodEnvPath, 'utf8');
    if (/VITE_USE_EMULATORS\s*=\s*true/i.test(contents)) {
      console.error('\n✖  apps/admin/.env.production has VITE_USE_EMULATORS=true. Set it to false for production.');
      process.exit(1);
    }
  }
}

console.log(`\nCampusFlow deploy → Firebase project alias: ${projectAlias}`);
console.log(`Targets: ${onlyArg}`);

if (isProd) {
  warnProdEnv();
}

if (!skipBuild) {
  const needsHosting = onlyArg.includes('hosting');
  const needsFunctions = onlyArg.includes('functions');

  if (needsHosting) {
    run('npm', ['run', 'build:admin'], {
      env: isProd ? { NODE_ENV: 'production' } : {},
    });
  }

  if (needsFunctions) {
    run('npm', ['run', 'build:functions']);
  }
}

run('firebase', ['use', projectAlias]);
run('firebase', ['deploy', '--only', onlyArg]);

if (onlyArg.includes('functions')) {
  console.log('\nEnsuring Cloud Run invoker IAM for callable functions…');
  run('node', ['scripts/set-functions-public-invoker.mjs', '--project', readProjectId(projectAlias)]);
}

console.log('\n✓ Deploy finished.');

function readProjectId(alias) {
  const firebaserc = JSON.parse(readFileSync(resolve(root, '.firebaserc'), 'utf8'));
  return firebaserc.projects?.[alias] ?? firebaserc.projects?.default ?? 'campusflow-f798c';
}

if (isProd) {
  console.log('\nPost-deploy checklist:');
  console.log('  1. firebase functions:secrets:set OD_SIGNING_KEY  (if not already set)');
  console.log('  2. Create first admin in Firebase Auth + Firestore, or use bootstrap script');
  console.log('  3. EAS production build: cd apps/mobile && eas build --profile production');
  console.log('  4. Verify healthCheck callable and admin login at Hosting URL');
}
