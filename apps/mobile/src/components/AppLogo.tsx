import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const logoSource = require('../../assets/images/logo.png');

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function AppLogo({
  size = 96,
  style,
  accessibilityLabel = 'Citians logo',
}: AppLogoProps) {
  return (
    <Image
      source={logoSource}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 16,
  },
});
