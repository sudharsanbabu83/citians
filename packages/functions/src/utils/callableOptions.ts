/**
 * Shared options for Gen 2 callable functions.
 * `invoker: 'public'` is required so browser preflight (OPTIONS) can reach Cloud Run;
 * auth is still enforced inside each handler via Firebase Auth tokens.
 */
export const callableOptions = {
  region: 'asia-south1',
  invoker: 'public',
  // Keep local web development origins explicit. The Functions emulator does
  // not reliably emit Access-Control-Allow-Origin for `cors: true` when the
  // request reaches it through the LAN IP used by a phone or another device.
  cors: [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://10.210.236.91:8081',
    'http://10.210.236.91:5173',
  ],
};
