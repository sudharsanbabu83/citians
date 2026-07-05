import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogoutButton } from '@/src/components/LogoutButton';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function HodProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const roleProfile = useAuthStore((s) => s.roleProfile);

  const hod = roleProfile?.type === 'HOD' ? roleProfile.data : null;
  const departmentName =
    roleProfile?.type === 'HOD' ? roleProfile.departmentName : '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.avatarCard, shadows.card]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={colors.primary} />
        </View>
        <Text style={styles.name}>{profile?.name ?? 'HOD'}</Text>
        <Text style={styles.email}>{profile?.email ?? '—'}</Text>
      </View>

      <View style={[styles.card, shadows.card]}>
        <ProfileRow icon="business-outline" label="Department" value={departmentName} />
        <ProfileRow
          icon="ribbon-outline"
          label="Designation"
          value={hod?.designation ?? '—'}
        />
        <ProfileRow icon="mail-outline" label="Email" value={profile?.email ?? '—'} />
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
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
    color: colors.textMuted,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
