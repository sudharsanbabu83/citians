#!/usr/bin/env node
/**
 * Starts Expo CLI with dependency validation disabled.
 *
 * On some networks (college Wi‑Fi, VPN, proxy) Expo's online doctor check fails with
 * "Body is unusable" or "fetch failed" and prevents Metro from starting.
 * Skipping validation is safe for local dev; run `npx expo-doctor` manually when needed.
 */
import { spawnSync } from 'node:child_process';

if (!process.env.EXPO_NO_DEPENDENCY_VALIDATION) {
  process.env.EXPO_NO_DEPENDENCY_VALIDATION = '1';
}

const expoArgs = process.argv.slice(2);
if (expoArgs.length === 0) {
  console.error('Usage: node scripts/start-expo.mjs <expo args...>');
  process.exit(1);
}

const result = spawnSync('npx', ['expo', ...expoArgs], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
