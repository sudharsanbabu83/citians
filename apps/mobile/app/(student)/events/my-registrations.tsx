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
import { EventTypeBadge } from '@/src/components/EventTypeBadge';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useMyEventRegistrations } from '@/src/hooks/useEvents';
import { formatEventDateTime } from '@/src/lib/events';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, spacing } from '@/src/theme';

export default function MyRegistrationsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const bottomPadding = useBottomContentPadding();
  const { data: registrations = [], isLoading, isError, refetch, isRefetching } =
    useMyEventRegistrations(user?.uid);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
    >
      <View style={[styles.card, styles.cardShadow]}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : isError ? (
          <Text style={styles.errorText}>Could not load registrations.</Text>
        ) : registrations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No registrations yet</Text>
            <Text style={styles.emptyCaption}>Browse events and register for hackathons on campus.</Text>
            <Pressable
              style={styles.browseButton}
              onPress={() => router.push('/(student)/(tabs)/events' as Href)}
            >
              <Text style={styles.browseButtonText}>Browse events</Text>
            </Pressable>
          </View>
        ) : (
          registrations.map((registration, index) => (
            <View key={registration.id}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() =>
                  router.push(`/(student)/events/${registration.eventId}` as Href)
                }
              >
                <View style={styles.rowContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{registration.event?.title ?? 'Event'}</Text>
                    <View style={[styles.statusPill, registration.status === 'WAITLISTED' && styles.waitlistPill, registration.status === 'PENDING' && styles.pendingPill]}>
                      <Text style={[styles.statusText, registration.status === 'WAITLISTED' && styles.waitlistText]}>{registration.status === 'APPROVED' || registration.status === 'REGISTERED' ? 'CONFIRMED' : registration.status}</Text>
                    </View>
                  </View>
                  {registration.event ? (
                    <>
                      <Text style={styles.subtitle}>
                        {formatEventDateTime(registration.event.startAt)}
                      </Text>
                      <EventTypeBadge type={registration.event.type} />
                    </>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              {['APPROVED', 'REGISTERED', 'ATTENDED'].includes(registration.status) ? (
                <Pressable style={styles.ticketButton} onPress={() => router.push(`/(student)/events/${registration.eventId}/ticket` as Href)}>
                  <Ionicons name="qr-code-outline" size={17} color={colors.white} />
                  <Text style={styles.ticketButtonText}>Open event pass</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.border },
  loader: { paddingVertical: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyTitle: { ...theme.typography.heading },
  emptyCaption: { ...theme.typography.caption, textAlign: 'center' },
  browseButton: {
    marginTop: spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  browseButtonText: { color: theme.colors.white, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  rowPressed: { opacity: 0.7 },
  rowContent: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textMuted },
  statusPill: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.colors.accentBg },
  pendingPill: { backgroundColor: theme.colors.background },
  waitlistPill: { backgroundColor: '#FFF2D6' },
  statusText: { color: theme.colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .4 },
  waitlistText: { color: '#8A4B00' },
  errorText: { color: theme.colors.error, textAlign: 'center', padding: spacing.md },
  ticketButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: theme.colors.primary, borderRadius: borderRadius.md, paddingVertical: 10, marginBottom: spacing.sm },
  ticketButtonText: { color: theme.colors.white, fontSize: 13, fontWeight: '700' },
});
