import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { PlatformBadge } from '@/src/components/PlatformBadge';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useAdminCompetitions } from '@/src/hooks/useCompetitions';
import { getFirstName } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';
import {
  formatCompetitionDate,
  formatCompetitionStatus,
  getDeadlineLabel,
} from '@/src/lib/competitions';
import { borderRadius, spacing } from '@/src/theme';

export default function CompetitionsAdminDashboard() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.md, includeTabBar: true });
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const firstName = profile ? getFirstName(profile.name) : 'Admin';

  const {
    data: competitions = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useAdminCompetitions(user?.uid);

  const publishedCount = competitions.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = competitions.filter((c) => c.status === 'DRAFT').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={[styles.hero, styles.heroShadow]}>
        <Text style={styles.heroGreeting}>Welcome, {firstName}</Text>
        <Text style={styles.heroTitle}>Competitions Admin</Text>
        <Text style={styles.heroSubtitle}>
          Curate hackathons from Devpost, HackerEarth, Unstop and more for all students.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.cardShadow]}>
          <Text style={styles.statValue}>{publishedCount}</Text>
          <Text style={styles.statLabel}>Live</Text>
        </View>
        <View style={[styles.statCard, styles.cardShadow]}>
          <Text style={styles.statValue}>{draftCount}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
        <View style={[styles.statCard, styles.cardShadow]}>
          <Text style={styles.statValue}>{competitions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <Pressable
        style={[styles.addButton, styles.cardShadow]}
        onPress={() => router.push('/(competitions-admin)/competitions/create' as Href)}
      >
        <View style={styles.addIcon}>
          <Ionicons name="add" size={24} color={colors.white} />
        </View>
        <View style={styles.addTextWrap}>
          <Text style={styles.addTitle}>Add hackathon</Text>
          <Text style={styles.addSubtitle}>Share an upcoming competition from any platform</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.sectionLabel}>Your listings</Text>
      <View style={[styles.card, styles.cardShadow]}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.errorText}>Could not load competitions.</Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : competitions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No competitions yet</Text>
            <Text style={styles.emptyCaption}>
              Add your first hackathon to make it visible to all students.
            </Text>
          </View>
        ) : (
          competitions.map((competition, index) => (
            <View key={competition.id}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                onPress={() =>
                  router.push(`/(competitions-admin)/competitions/${competition.id}` as Href)
                }
              >
                <View style={styles.listContent}>
                  <View style={styles.listTop}>
                    <PlatformBadge
                      platform={competition.platform}
                      platformLabel={competition.platformLabel}
                    />
                    <Text
                      style={[
                        styles.statusBadge,
                        competition.status === 'PUBLISHED' && styles.statusPublished,
                        competition.status === 'DRAFT' && styles.statusDraft,
                        competition.status === 'CANCELLED' && styles.statusCancelled,
                      ]}
                    >
                      {formatCompetitionStatus(competition.status)}
                    </Text>
                  </View>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {competition.title}
                  </Text>
                  <Text style={styles.listMeta}>
                    {formatCompetitionDate(competition.startAt)} · {getDeadlineLabel(competition)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    heroShadow: theme.shadows.hero,
    cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroGreeting: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextWrap: { flex: 1 },
  addTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  addSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  sectionLabel: { ...theme.typography.label, marginBottom: spacing.sm },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  loader: { paddingVertical: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  emptyTitle: { ...theme.typography.heading },
  emptyCaption: { ...theme.typography.caption, textAlign: 'center' },
  errorText: { color: theme.colors.error },
  retryText: { color: theme.colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listRowPressed: { opacity: 0.7 },
  listContent: { flex: 1, minWidth: 0, gap: 4 },
  listTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  statusPublished: { color: theme.colors.success },
  statusDraft: { color: theme.colors.warning },
  statusCancelled: { color: theme.colors.error },
  listTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  listMeta: { fontSize: 12, color: theme.colors.textMuted },
});
