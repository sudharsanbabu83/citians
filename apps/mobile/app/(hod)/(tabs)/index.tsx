import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useUnreadNotificationCount } from '@/src/hooks/useNotifications';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { getFirstName } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export default function HodHomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.md, includeTabBar: true });
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const firstName = profile ? getFirstName(profile.name) : 'HOD';
  const departmentName = roleProfile?.type === 'HOD' ? roleProfile.departmentName : 'Your department';
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.uid);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroBanner, styles.heroShadow]}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroGreeting}>Welcome, {firstName}</Text>
            <Text style={styles.heroTitle}>HOD Workspace</Text>
            <Text style={styles.heroSubtitle}>{departmentName}</Text>
          </View>
          <Pressable
            style={styles.notifButton}
            onPress={() => router.push('/(hod)/notifications' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            {unreadCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Department workspace</Text>
      <View style={[styles.card, styles.cardShadow]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentBg }]}>
          <Ionicons name="school-outline" size={26} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Campus activity hub</Text>
        <Text style={styles.cardCaption}>
          Stay up to date with campus announcements and student community activity.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Quick access</Text>
      <Pressable style={[styles.actionCard, styles.cardShadow]} onPress={() => router.push('/(hod)/notifications' as Href)}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentBg }]}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <Text style={styles.cardCaption}>Review the latest campus updates.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
      <Pressable style={[styles.actionCard, styles.cardShadow]} onPress={() => router.push('/(hod)/(tabs)/profile' as Href)}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentBg }]}>
          <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.cardTitle}>My profile</Text>
          <Text style={styles.cardCaption}>View your department profile.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: spacing.md },
    heroShadow: theme.shadows.hero,
    cardShadow: theme.shadows.card,
    heroBanner: { backgroundColor: theme.colors.primary, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
    heroTextWrap: { flex: 1 },
    heroGreeting: { color: theme.colors.secondary, fontSize: 14, fontWeight: '500', marginBottom: spacing.xs },
    heroTitle: { color: theme.colors.white, fontSize: 26, fontWeight: '800', marginBottom: spacing.xs },
    heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
    notifButton: { position: 'relative', width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    notifBadgeText: { color: theme.colors.text, fontSize: 10, fontWeight: '800' },
    sectionLabel: { ...theme.typography.label, marginBottom: spacing.sm },
    card: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.lg },
    actionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
    iconWrap: { width: 48, height: 48, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
    actionText: { flex: 1 },
    cardTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
    cardCaption: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  });
