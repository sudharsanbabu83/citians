import { defineSecret } from 'firebase-functions/params';

/** OD pass QR signing key — set via: firebase functions:secrets:set OD_SIGNING_KEY */
export const odSigningKey = defineSecret('OD_SIGNING_KEY');
