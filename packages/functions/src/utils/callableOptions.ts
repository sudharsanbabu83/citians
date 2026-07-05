/**
 * Shared options for Gen 2 callable functions.
 * `invoker: 'public'` is required so browser preflight (OPTIONS) can reach Cloud Run;
 * auth is still enforced inside each handler via Firebase Auth tokens.
 */
export const callableOptions = {
  region: 'asia-south1',
  invoker: 'public',
  cors: true,
} as const;
