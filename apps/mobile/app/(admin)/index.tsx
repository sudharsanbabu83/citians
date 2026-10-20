import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { LogoutButton } from '@/src/components/LogoutButton';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, spacing } from '@/src/theme';

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (!isAuthLoading && profile && !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    if (profile.role === 'COMPETITIONS_ADMIN') return <Redirect href="/(competitions-admin)/(tabs)" />;
    if (profile.role === 'STUDENT') return <Redirect href="/(student)/(tabs)" />;
    if (profile.role === 'HOD') return <Redirect href="/(hod)/(tabs)" />;
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
        <View style={[styles.card, styles.cardShadow]}>
          <View style={styles.iconWrap}>
            <Ionicons name="desktop-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Web dashboard only</Text>
          <Text style={styles.message}>
            Admin access is via the Citians web dashboard. Use a desktop browser to
            manage departments, students, HODs, and audit logs.
          </Text>
          {profile && (
            <Text style={styles.signedIn}>
              Signed in as {profile.name} ({profile.email})
            </Text>
          )}
        </View>
      <LogoutButton />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...theme.typography.heading,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...theme.typography.caption,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signedIn: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
