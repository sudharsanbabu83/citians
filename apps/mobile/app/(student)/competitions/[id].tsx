import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import type React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
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
import { useCompetition } from '@/src/hooks/useCompetitions';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import {
  formatCompetitionDateTime,
  formatCompetitionMode,
  getDeadlineLabel,
  isRegistrationOpen,
} from '@/src/lib/competitions';
import { borderRadius, spacing } from '@/src/theme';

export default function StudentCompetitionDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottomPadding = useBottomContentPadding();
  const { data: competition, isLoading, isError } = useCompetition(id);
  const requireLogin = useLoginRequired();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !competition || competition.status !== 'PUBLISHED') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Competition not found.</Text>
      </View>
    );
  }

  const open = isRegistrationOpen(competition);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={[styles.heroCard, styles.cardShadow]}>
        <PlatformBadge
          platform={competition.platform}
          platformLabel={competition.platformLabel}
        />
        <Text style={styles.title}>{competition.title}</Text>
        {competition.prizePool ? (
          <View style={styles.prizeBanner}>
            <Ionicons name="trophy" size={18} color={colors.text} />
            <Text style={styles.prizeText}>{competition.prizePool}</Text>
          </View>
        ) : null}
        <Text style={styles.description}>{competition.description}</Text>
      </View>

      <View style={[styles.card, styles.cardShadow]}>
        <DetailRow icon="calendar-outline" label="Starts" value={formatCompetitionDateTime(competition.startAt)} />
        <DetailRow icon="flag-outline" label="Ends" value={formatCompetitionDateTime(competition.endAt)} />
        <DetailRow
          icon="time-outline"
          label="Registration deadline"
          value={formatCompetitionDateTime(competition.registrationDeadline)}
        />
        <DetailRow icon="globe-outline" label="Mode" value={formatCompetitionMode(competition.mode)} />
        {competition.venue ? (
          <DetailRow icon="location-outline" label="Venue" value={competition.venue} />
        ) : null}
        {competition.teamSize ? (
          <DetailRow icon="people-outline" label="Team size" value={competition.teamSize} />
        ) : null}
      </View>

      <View style={[styles.deadlineCard, open ? styles.deadlineOpen : styles.deadlineClosed]}>
        <Ionicons
          name={open ? 'flash-outline' : 'lock-closed-outline'}
          size={20}
          color={open ? colors.warning : colors.textMuted}
        />
        <Text style={[styles.deadlineText, open && styles.deadlineTextOpen]}>
          {getDeadlineLabel(competition)}
        </Text>
      </View>

      <Pressable
        style={[styles.registerButton, !open && styles.registerButtonDisabled]}
        onPress={() => {
          if (requireLogin('register for a competition')) {
            Linking.openURL(competition.registrationUrl);
          }
        }}
        disabled={!open}
      >
        <Ionicons name="open-outline" size={20} color={colors.white} />
        <Text style={styles.registerButtonText}>
          {open ? 'Register on platform' : 'Registration closed'}
        </Text>
      </Pressable>

      <Text style={styles.footerHint}>
        You will complete registration on the external platform ({competition.registrationUrl}).
      </Text>
    </ScrollView>
  );
}

function DetailRow({
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
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: theme.colors.error, fontWeight: '600' },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, lineHeight: 30 },
  prizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.colors.accentBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  prizeText: { color: theme.colors.text, fontWeight: '700', flex: 1 },
  description: { ...theme.typography.caption, lineHeight: 22 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailRow: { flexDirection: 'row', gap: spacing.sm },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted },
  detailValue: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  deadlineOpen: { backgroundColor: theme.colors.warningBg },
  deadlineClosed: { backgroundColor: theme.colors.background },
  deadlineText: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted, flex: 1 },
  deadlineTextOpen: { color: theme.colors.warning },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  registerButtonDisabled: { backgroundColor: theme.colors.textMuted },
  registerButtonText: { color: theme.colors.white, fontWeight: '800', fontSize: 16 },
  footerHint: { ...theme.typography.caption, textAlign: 'center', lineHeight: 20 },
});
