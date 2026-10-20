import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { PlatformBadge } from '@/src/components/PlatformBadge';
import {
  formatCompetitionDate,
  formatCompetitionMode,
  getDeadlineLabel,
  isRegistrationOpen,
  type CompetitionWithId,
} from '@/src/lib/competitions';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

interface CompetitionCardProps {
  competition: CompetitionWithId;
  onPress: () => void;
  featured?: boolean;
}

export function CompetitionCard({ competition, onPress, featured }: CompetitionCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const open = isRegistrationOpen(competition);
  const deadlineLabel = getDeadlineLabel(competition);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        featured && styles.cardFeatured,
        styles.cardShadow,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {featured ? (
        <View style={styles.featuredBanner}>
          <View style={styles.featuredTop}>
            <View style={styles.featuredPill}>
              <Ionicons name="sparkles" size={12} color={colors.white} />
              <Text style={styles.featuredPillText}>Featured</Text>
            </View>
            <PlatformBadge
              platform={competition.platform}
              platformLabel={competition.platformLabel}
            />
          </View>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {competition.title}
          </Text>
          {competition.prizePool ? (
            <Text style={styles.featuredPrize}>🏆 {competition.prizePool}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.body}>
        {!featured ? (
          <View style={styles.topRow}>
            <PlatformBadge
              platform={competition.platform}
              platformLabel={competition.platformLabel}
            />
            <View style={[styles.statusDot, open ? styles.statusOpen : styles.statusClosed]} />
          </View>
        ) : null}

        {!featured ? (
          <Text style={styles.title} numberOfLines={2}>
            {competition.title}
          </Text>
        ) : null}

        <Text style={styles.description} numberOfLines={2}>
          {competition.description}
        </Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.metaText}>
              {formatCompetitionDate(competition.startAt)} –{' '}
              {formatCompetitionDate(competition.endAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
            <Text style={styles.metaText}>{formatCompetitionMode(competition.mode)}</Text>
          </View>
          {competition.teamSize ? (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={colors.primary} />
              <Text style={styles.metaText}>{competition.teamSize}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={[styles.deadlineChip, open ? styles.deadlineOpen : styles.deadlineClosed]}>
            <Ionicons
              name={open ? 'time-outline' : 'lock-closed-outline'}
              size={14}
              color={open ? colors.warning : colors.textMuted}
            />
            <Text style={[styles.deadlineText, open ? styles.deadlineTextOpen : null]}>
              {deadlineLabel}
            </Text>
          </View>
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>View details</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardFeatured: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardPressed: {
    opacity: 0.92,
  },
  featuredBanner: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  featuredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  featuredPillText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  featuredTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontFamily: fontFamilies.display,
    lineHeight: 26,
  },
  featuredPrize: {
    color: theme.colors.inverseText,
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.9,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: theme.colors.text,
  },
  statusClosed: {
    backgroundColor: theme.colors.textMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fontFamilies.display,
    color: theme.colors.text,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  metaGrid: {
    gap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    flex: 1,
  },
  deadlineOpen: {
    backgroundColor: theme.colors.warningBg,
  },
  deadlineClosed: {
    backgroundColor: theme.colors.background,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  deadlineTextOpen: {
    color: theme.colors.warning,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
