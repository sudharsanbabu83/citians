import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppearanceSettings } from '@/src/components/AppearanceSettings';
import { LogoutButton } from '@/src/components/LogoutButton';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export default function HodProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const profile = useAuthStore((s) => s.profile);
  const roleProfile = useAuthStore((s) => s.roleProfile);

  const hod = roleProfile?.type === 'HOD' ? roleProfile.data : null;
  const departmentName =
    roleProfile?.type === 'HOD' ? roleProfile.departmentName : '—';
  const bottomPadding = useBottomContentPadding({ extra: spacing.md, includeTabBar: true });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.avatarCard, styles.cardShadow]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={colors.primary} />
        </View>
        <Text style={styles.name}>{profile?.name ?? 'HOD'}</Text>
        <Text style={styles.email}>{profile?.email ?? '—'}</Text>
      </View>

      <View style={[styles.card, styles.cardShadow]}>
        <ProfileRow icon="business-outline" label="Department" value={departmentName} />
        <ProfileRow
          icon="ribbon-outline"
          label="Designation"
          value={hod?.designation ?? '—'}
        />
        <ProfileRow icon="mail-outline" label="Email" value={profile?.email ?? '—'} />
      </View>

      <AppearanceSettings />
      <LogoutButton />
    </ScrollView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: spacing.md,
      gap: spacing.md,
    },
    avatarCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    cardShadow: theme.shadows.card,
    avatar: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    email: {
      ...theme.typography.caption,
      marginTop: spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    rowValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
  });
