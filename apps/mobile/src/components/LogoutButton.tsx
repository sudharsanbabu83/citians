import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export function LogoutButton() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          queryClient.clear();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <Pressable style={[styles.button, styles.cardShadow]} onPress={handleLogout}>
      <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
      <Text style={styles.label}>Sign out</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    cardShadow: theme.shadows.card,
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
  });
