import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CampusFlow',
  slug: 'campusflow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'campusflow',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.campusflow.app',
  },
  android: {
    package: 'com.campusflow.app',
    edgeToEdgeEnabled: true,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#1E3A8A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#1E3A8A',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow CampusFlow to access your camera for QR code scanning.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#1E3A8A',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    useEmulators: process.env.EXPO_PUBLIC_USE_EMULATORS === 'true',
    emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost',
    collegeEmailDomain: process.env.EXPO_PUBLIC_COLLEGE_EMAIL_DOMAIN ?? 'citchennai.net',
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'campusflow-f798c',
    eas: {
      projectId: 'f32677f3-8a61-4f7d-9d5d-0e2db563fffe',
    },
  },
});
