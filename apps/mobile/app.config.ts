import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Citians',
  slug: 'campusflow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'campusflow',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.campusflow.app',
    buildNumber: '1',
    googleServicesFile:
      process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    infoPlist: {
      NSCameraUsageDescription:
        'Allow Citians to access your camera for QR code scanning.',
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: 'com.campusflow.app',
    edgeToEdgeEnabled: true,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#000000',
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
      'expo-audio',
      {
        microphonePermission:
          'Allow Citians to use your microphone for live Pulse Talk voice drops.',
      },
    ],
    [
      'expo-splash-screen',
      {
        // Show the butterfly on the native launch screen. The JS splash that
        // follows keeps the existing wordmark-and-flight animation unchanged.
        image: './assets/splash/butterfly-transparent.png',
        imageWidth: 280,
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Citians to access your camera for QR code scanning.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#191919',
        mode: 'production',
      },
    ],
    '@react-native-community/datetimepicker',
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
