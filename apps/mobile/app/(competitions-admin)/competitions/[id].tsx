import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import type React from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useCompetition, useCompetitionMutations } from '@/src/hooks/useCompetitions';
import { useAuthStore } from '@/src/lib/authStore';
import {
  formatCompetitionDateTime,
  formatCompetitionMode,
  formatCompetitionStatus,
  getDeadlineLabel,
  isRegistrationOpen,
} from '@/src/lib/competitions';
import { borderRadius, spacing } from '@/src/theme';

function mapCallableError(error: unknown): string {
  const message = (error as Error).message;
  return message || 'Something went wrong. Please try again.';
}

export default function AdminCompetitionDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: competition, isLoading, isError } = useCompetition(id);
  const { update, cancel } = useCompetitionMutations(user?.uid);
  const bottomPadding = useBottomContentPadding();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !competition) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Competition not found.</Text>
      </View>
    );
  }

  const handlePublish = () => {
    Alert.alert('Publish competition', 'Make this visible to all students?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          try {
            await update.mutateAsync({ competitionId: competition.id, publish: true });
            Alert.alert('Published', 'Students can now see this competition.');
          } catch (error) {
            Alert.alert('Could not publish', mapCallableError(error));
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel competition', 'This will hide it from students.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel listing',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel.mutateAsync({ competitionId: competition.id });
            Alert.alert('Cancelled', 'Competition has been cancelled.');
          } catch (error) {
            Alert.alert('Could not cancel', mapCallableError(error));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={[styles.card, styles.cardShadow]}>
        <View style={styles.topRow}>
          <PlatformBadge
            platform={competition.platform}
            platformLabel={competition.platformLabel}
          />
          <Text style={styles.status}>{formatCompetitionStatus(competition.status)}</Text>
        </View>
        <Text style={styles.title}>{competition.title}</Text>
        <Text style={styles.description}>{competition.description}</Text>

        <DetailRow icon="calendar-outline" label="Starts" value={formatCompetitionDateTime(competition.startAt)} />
        <DetailRow icon="flag-outline" label="Ends" value={formatCompetitionDateTime(competition.endAt)} />
        <DetailRow
          icon="time-outline"
          label="Registration"
          value={`${formatCompetitionDateTime(competition.registrationDeadline)} · ${getDeadlineLabel(competition)}`}
        />
        <DetailRow icon="globe-outline" label="Mode" value={formatCompetitionMode(competition.mode)} />
        {competition.venue ? (
          <DetailRow icon="location-outline" label="Venue" value={competition.venue} />
        ) : null}
        {competition.prizePool ? (
          <DetailRow icon="trophy-outline" label="Prize pool" value={competition.prizePool} />
        ) : null}
        {competition.teamSize ? (
          <DetailRow icon="people-outline" label="Team size" value={competition.teamSize} />
        ) : null}

        <Pressable
          style={styles.linkButton}
          onPress={() => Linking.openURL(competition.registrationUrl)}
        >
          <Ionicons name="open-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Open registration page</Text>
        </Pressable>
      </View>

      {competition.status === 'DRAFT' ? (
        <Pressable
          style={[styles.primaryButton, update.isPending && styles.buttonDisabled]}
          onPress={handlePublish}
          disabled={update.isPending}
        >
          <Text style={styles.primaryButtonText}>Publish for students</Text>
        </Pressable>
      ) : null}

      {competition.status !== 'CANCELLED' ? (
        <Pressable
          style={[styles.dangerButton, cancel.isPending && styles.buttonDisabled]}
          onPress={handleCancel}
          disabled={cancel.isPending}
        >
          <Text style={styles.dangerButtonText}>Cancel listing</Text>
        </Pressable>
      ) : null}

      {competition.status === 'PUBLISHED' && isRegistrationOpen(competition) ? (
        <Text style={styles.hint}>This competition is live and visible to all students.</Text>
      ) : null}
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
      <Ionicons name={icon} size={18} color={colors.textMuted} />
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  status: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  description: { ...theme.typography.caption, lineHeight: 22, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted },
  detailValue: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: { color: theme.colors.primary, fontWeight: '700' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', fontSize: 16 },
  dangerButton: {
    backgroundColor: theme.colors.errorBg,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: { color: theme.colors.error, fontWeight: '700', fontSize: 16 },
  buttonDisabled: { opacity: 0.7 },
  hint: { ...theme.typography.caption, textAlign: 'center' },
});
