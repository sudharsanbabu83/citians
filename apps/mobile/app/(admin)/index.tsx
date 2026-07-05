import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LogoutButton } from '@/src/components/LogoutButton';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function AdminScreen() {
  const { user, profile, isAuthLoading } = useAuthStore();

  if (!isAuthLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (!isAuthLoading && profile && profile.role !== 'ADMIN') {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
        <View style={[styles.card, shadows.card]}>
          <View style={styles.iconWrap}>
            <Ionicons name="desktop-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Web dashboard only</Text>
          <Text style={styles.message}>
            Admin access is via the CampusFlow web dashboard. Use a desktop browser to
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signedIn: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
