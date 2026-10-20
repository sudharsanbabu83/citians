import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppearanceSettings } from '@/src/components/AppearanceSettings';
import { LogoutButton } from '@/src/components/LogoutButton';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export default function StudentProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const profile = useAuthStore((s) => s.profile);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);

  const student =
    roleProfile?.type === 'STUDENT' ? roleProfile.data : null;
  const departmentName =
    roleProfile?.type === 'STUDENT' ? roleProfile.departmentName : '—';
  const bottomPadding = useBottomContentPadding({ extra: spacing.md });

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
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.avatarCard, styles.cardShadow]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={colors.primary} />
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Student</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? 'Student'}</Text>
        <Text style={styles.citianId}>{profile?.citianId ?? 'Citian ID pending'}</Text>
        <Text style={styles.email}>{profile?.email ?? '—'}</Text>
      </View>

      <View style={[styles.card, styles.cardShadow]}>
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

      <AppearanceSettings />
      <Pressable style={[styles.resumeButton, { backgroundColor: '#FFF0C2', borderColor: '#F6D982' }]} onPress={() => router.push('/(student)/resume-builder' as Href)}>
        <Ionicons name="document-text-outline" size={21} color="#D45772" />
        <View style={styles.focusButtonText}>
          <Text style={styles.resumeButtonTitle}>Resume Builder</Text>
          <Text style={styles.resumeButtonSubtitle}>Create an A4-ready resume from a built-in template</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D45772" />
      </Pressable>
      <Pressable style={[styles.focusButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/(student)/focus-blocker' as Href)}>
        <Ionicons name="shield-checkmark-outline" size={21} color="#fff" />
        <View style={styles.focusButtonText}>
          <Text style={styles.focusButtonTitle}>Focus Blocker</Text>
          <Text style={styles.focusButtonSubtitle}>Block distracting apps while studying</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </Pressable>
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
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
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
    citianId: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '800',
      marginTop: spacing.xs,
      letterSpacing: 0.4,
    },
    roleBadge: {
      backgroundColor: theme.colors.accentBg,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginBottom: spacing.xs,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
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
    focusButton: {
      borderRadius: borderRadius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    resumeButton: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    resumeButtonTitle: { color: '#29233D', fontSize: 16, fontWeight: '800' },
    resumeButtonSubtitle: { color: '#706477', fontSize: 12, marginTop: 2 },
    focusButtonText: { flex: 1 },
    focusButtonTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    focusButtonSubtitle: { color: 'rgba(255,255,255,.8)', fontSize: 12, marginTop: 2 },
  });
