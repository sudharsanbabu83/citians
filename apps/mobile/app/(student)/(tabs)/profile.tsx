import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogoutButton } from '@/src/components/LogoutButton';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function StudentProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);

  const student =
    roleProfile?.type === 'STUDENT' ? roleProfile.data : null;
  const departmentName =
    roleProfile?.type === 'STUDENT' ? roleProfile.departmentName : '—';

  if (isProfileLoading && !profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Student</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? 'Student'}</Text>
        <Text style={styles.email}>{profile?.email ?? '—'}</Text>
      </View>

      <View style={[styles.card, shadows.card]}>
        {profile?.phone ? (
          <ProfileRow icon="call-outline" label="Phone" value={profile.phone} />
        ) : null}
        <ProfileRow
          icon="school-outline"
          label="Register No."
          value={student?.registerNumber ?? '—'}
        />
        <ProfileRow icon="business-outline" label="Department" value={departmentName} />
        <ProfileRow
          icon="calendar-outline"
          label="Year / Section"
          value={
            student ? `${student.year} / ${student.section}` : '—'
          }
        />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
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
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
