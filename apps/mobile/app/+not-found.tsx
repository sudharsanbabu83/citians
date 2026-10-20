import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { spacing } from '@/src/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" asChild>
          <Pressable style={styles.link}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Go to home screen!</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    link: {
      marginTop: spacing.md,
      paddingVertical: spacing.md,
    },
    linkText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
