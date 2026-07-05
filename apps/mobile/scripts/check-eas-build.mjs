#!/usr/bin/env node
/**
 * Pre-flight checks before EAS preview/production Android builds.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const googleServicesPath = resolve(mobileRoot, 'google-services.json');
const appConfigPath = resolve(mobileRoot, 'app.config.ts');

let failed = false;

if (!existsSync(googleServicesPath)) {
  console.error('\n✖  apps/mobile/google-services.json is missing.');
  console.error('   Download it from Firebase Console → Project settings → Android app (com.campusflow.app)\n');
  failed = true;
} else {
  console.log('✓ google-services.json found');
}

const appConfig = readFileSync(appConfigPath, 'utf8');
const hasEasProjectId =
  /projectId:\s*['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/i.test(
    appConfig
  );

if (!hasEasProjectId) {
  console.error('\n✖  EAS project is not linked yet.');
  console.error('   Run: cd apps/mobile && eas login && eas init');
  console.error('   eas init will write a real projectId UUID into app.config.ts\n');
  failed = true;
} else {
  console.log('✓ EAS projectId configured in app.config.ts');
}

console.log('\nFor EAS cloud builds, upload google-services.json once (file is gitignored):');
console.log('  cd apps/mobile');
console.log('  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json');
console.log('\nOr build locally (uses ./google-services.json on disk):');
console.log('  eas build --profile preview --platform android --local\n');

if (failed) {
  process.exit(1);
}
