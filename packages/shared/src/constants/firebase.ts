/**
 * CampusFlow Firebase project (Console: Campusflow).
 * Client API keys are restricted in Firebase Console — safe to embed in apps.
 */
export const FIREBASE_PROJECT_ID = 'campusflow-f798c';
export const FIREBASE_AUTH_DOMAIN = `${FIREBASE_PROJECT_ID}.firebaseapp.com`;
export const FIREBASE_STORAGE_BUCKET = `${FIREBASE_PROJECT_ID}.firebasestorage.app`;
export const FIREBASE_MESSAGING_SENDER_ID = '1023799870586';

/** Android app (mobile) — from google-services.json */
export const FIREBASE_ANDROID_API_KEY = 'AIzaSyB_4Dg1p2nr6agFJyA_aQdLUcWCRY1kN4o';
export const FIREBASE_ANDROID_APP_ID = '1:1023799870586:android:3b83d7106f4ffd3b4c27c3';

/** Web app (admin dashboard) — from Firebase Console web app config */
export const FIREBASE_WEB_API_KEY = 'AIzaSyBk5mJHez0J_EkBZUU1ZnRKtQEs2gTO0M0';
export const FIREBASE_WEB_APP_ID = '1:1023799870586:web:ef79dee19b9de6934c27c3';
export const FIREBASE_MEASUREMENT_ID = 'G-7VG5RXB0NN';

/** @deprecated Use FIREBASE_ANDROID_API_KEY or FIREBASE_WEB_API_KEY */
export const FIREBASE_API_KEY = FIREBASE_ANDROID_API_KEY;
