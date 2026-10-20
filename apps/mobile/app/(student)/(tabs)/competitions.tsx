import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
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
import type { AppTheme } from '@/src/lib/themeStore';import type { CompetitionPlatform } from '@campusflow/shared';
import { COMPETITION_PLATFORMS } from '@campusflow/shared';

import { CompetitionCard } from '@/src/components/CompetitionCard';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { usePublishedCompetitions } from '@/src/hooks/useCompetitions';
import { countOpenRegistrations, formatPlatformLabel } from '@/src/lib/competitions';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

const FILTERS: Array<{ key: CompetitionPlatform | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  ...COMPETITION_PLATFORMS.map((platform) => ({
    key: platform,
    label: formatPlatformLabel(platform),
  })),
];

export default function StudentCompetitionsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.md, includeTabBar: true });
  const responsive = useResponsiveLayout();
  const [filter, setFilter] = useState<CompetitionPlatform | 'ALL'>('ALL');
  const { data: competitions = [], isLoading, isError, refetch, isRefetching } =
    usePublishedCompetitions(filter);

  const openCount = countOpenRegistrations(competitions);
  const featured = competitions[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, responsive.readableContentStyle, { paddingBottom: bottomPadding, paddingHorizontal: responsive.gutter }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, styles.heroShadow]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="trophy" size={28} color={colors.secondary} />
        </View>
        <Text style={styles.heroTitle}>Hackathons & Competitions</Text>
        <Text style={styles.heroSubtitle}>
          Discover curated hackathons from Devpost, HackerEarth, Unstop and more — hand-picked for
          CIT students.
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{competitions.length}</Text>
            <Text style={styles.heroStatLabel}>Upcoming</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{openCount}</Text>
            <Text style={styles.heroStatLabel}>Open to register</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={[styles.card, styles.cardShadow, styles.centered]}>
          <Text style={styles.errorText}>Could not load competitions.</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : competitions.length === 0 ? (
        <View style={[styles.card, styles.cardShadow, styles.centered]}>
          <Ionicons name="planet-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No competitions yet</Text>
          <Text style={styles.emptyCaption}>
            Check back soon — new hackathons from external platforms will appear here.
          </Text>
        </View>
      ) : (
        <>
          {featured ? (
            <CompetitionCard
              competition={featured}
              featured
              onPress={() => router.push(`/(student)/competitions/${featured.id}` as Href)}
            />
          ) : null}
          {competitions.slice(featured ? 1 : 0).map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition}
              onPress={() => router.push(`/(student)/competitions/${competition.id}` as Href)}
            />
          ))}
        </>
      )}
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
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 26,
    fontFamily: fontFamilies.displayStrong,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: theme.colors.white, fontSize: 21, fontFamily: fontFamilies.mono },
  heroStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterScroll: { flexGrow: 0, marginBottom: spacing.md },
  filterChip: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  filterTextActive: { color: theme.colors.white },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  centered: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyTitle: { ...theme.typography.heading },
  emptyCaption: { ...theme.typography.caption, textAlign: 'center', lineHeight: 20 },
  errorText: { color: theme.colors.error, fontWeight: '600' },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: theme.colors.white, fontWeight: '600' },
});
