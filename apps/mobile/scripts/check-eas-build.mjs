#!/usr/bin/env node
/**
 * Pre-flight checks before EAS preview or production mobile builds.
 *
 * Usage:
 *   node scripts/check-eas-build.mjs android
 *   node scripts/check-eas-build.mjs ios
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platform = (process.argv[2] ?? 'android').toLowerCase();

const checks = {
  android: {
    label: 'google-services.json',
    path: resolve(mobileRoot, 'google-services.json'),
    secret: 'GOOGLE_SERVICES_JSON',
    easBuild: 'eas build --profile preview --platform android',
  },
  ios: {
    label: 'GoogleService-Info.plist',
    path: resolve(mobileRoot, 'GoogleService-Info.plist'),
    secret: 'GOOGLE_SERVICES_PLIST',
    easBuild: 'eas build --profile preview --platform ios',
  },
};

const selected = checks[platform];
if (!selected) {
  console.error(`Unsupported platform "${platform}". Use "android" or "ios".`);
  process.exit(1);
}

let failed = false;

if (!existsSync(selected.path)) {
  console.error(`\napps/mobile/${selected.label} is missing.`);
  console.error(
    `Download it from Firebase Console > Project settings > ${platform === 'ios' ? 'iOS' : 'Android'} app (com.campusflow.app).`
  );
  failed = true;
} else {
  console.log(`${selected.label} found`);

  if (platform === 'android') {
    try {
      JSON.parse(readFileSync(selected.path, 'utf8'));
      console.log('google-services.json is valid JSON');
    } catch {
      console.error('\ngoogle-services.json is not valid JSON.\n');
      failed = true;
    }
  }
}

const appConfigPath = resolve(mobileRoot, 'app.config.ts');
const appConfig = readFileSync(appConfigPath, 'utf8');
const hasEasProjectId =
  /projectId:\s*['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/i.test(
    appConfig
  );

if (!hasEasProjectId) {
  console.error('\nEAS project is not linked yet. Run: cd apps/mobile && eas login && eas init\n');
  failed = true;
} else {
  console.log('EAS projectId configured in app.config.ts');
}

console.log(`\nFor EAS cloud builds, upload ${selected.label} once (the file is gitignored):`);
console.log('  cd apps/mobile');
console.log(
  `  eas secret:create --scope project --name ${selected.secret} --type file --value ./${selected.label}`
);
console.log('\nOr build locally (uses the config file on disk):');
console.log(`  ${selected.easBuild} --local\n`);

if (failed) {
  process.exit(1);
}
