import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing } from '@/src/theme';

export function LogoutButton() {
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
    <Pressable style={[styles.button, shadows.card]} onPress={handleLogout}>
      <Ionicons name="log-out-outline" size={20} color={colors.error} />
      <Text style={styles.label}>Sign out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
