import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppLogo } from '@/src/components/AppLogo';

type AppHeaderLogoProps = {
  size?: number;
  href?: Href;
};

export function AppHeaderLogo({ size = 30, href }: AppHeaderLogoProps) {
  const handlePress = () => {
    if (href) router.push(href);
  };

  return (
    <Pressable
      onPress={href ? handlePress : undefined}
      disabled={!href}
      hitSlop={8}
      style={styles.wrap}
      accessibilityRole={href ? 'button' : 'image'}
      accessibilityLabel={href ? 'Open profile' : 'Citians logo'}
    >
      <AppLogo size={size} style={styles.logo} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    borderRadius: 8,
  },
});
