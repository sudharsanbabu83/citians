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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardStatCard } from '@/src/components/DashboardStatCard';
import { ODRequestListItem } from '@/src/components/ODRequestListItem';
import { useEmulators, resolvedEmulatorHost, getEmulatorHost } from '@/src/config/firebase';
import { useStudentDashboard } from '@/src/hooks/useStudentDashboard';
import { useUnreadNotificationCount } from '@/src/hooks/useNotifications';
import { getFirstName } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';
import { useAppStore } from '@/src/lib/store';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function StudentHomeScreen() {
  const insets = useSafeAreaInsets();
  const { healthCheck, healthError, isCheckingHealth } = useAppStore();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useStudentDashboard(user?.uid);

  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.uid);

  const connectionOk = !isCheckingHealth && !!healthCheck;
  const connectionFailed = !isCheckingHealth && !!healthError;
  const emulatorHost = resolvedEmulatorHost ?? (useEmulators ? getEmulatorHost() : null);
  const firstName = profile ? getFirstName(profile.name) : 'Student';
  const stats = dashboard?.stats ?? { approved: 0, pending: 0, rejected: 0 };
  const requests = dashboard?.requests ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: spacing.md }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
    >
      <View style={[styles.heroBanner, shadows.hero]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Welcome back, {firstName}</Text>
            <Text style={styles.brand}>CampusFlow</Text>
          </View>
          <Pressable
            style={styles.notifButton}
            onPress={() => router.push('/(student)/notifications' as Href)}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        <Text style={styles.heroSubtitle}>
          Manage On-Duty requests, track approvals, and access your digital OD pass.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Your overview</Text>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.errorText}>Could not load your OD overview.</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.statsRow}>
          <DashboardStatCard
            label="Approved"
            value={stats.approved}
            tint={colors.success}
            bg={colors.successBg}
          />
          <DashboardStatCard
            label="Pending"
            value={stats.pending}
            tint={colors.warning}
            bg={colors.warningBg}
          />
          <DashboardStatCard
            label="Rejected"
            value={stats.rejected}
            tint={colors.error}
            bg={colors.errorBg}
          />
        </View>
      )}

      <Text style={styles.sectionLabel}>Quick actions</Text>
      <Pressable
        style={[styles.ctaButton, shadows.card]}
        onPress={() => router.push('/(student)/od/apply' as Href)}
      >
        <View style={styles.ctaIconWrap}>
          <Ionicons name="document-text-outline" size={22} color={colors.white} />
        </View>
        <View style={styles.ctaTextWrap}>
          <Text style={styles.ctaTitle}>Apply for On-Duty</Text>
          <Text style={styles.ctaSubtitle}>Submit a new OD request to your HOD</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.sectionLabel}>Recent activity</Text>
      <View style={[styles.card, shadows.card]}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
            <Text style={styles.emptyTitle}>Unable to load requests</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyCaption}>
              Your OD requests and status updates will appear here.
            </Text>
          </View>
        ) : (
          requests.map((request, index) => (
            <View key={request.id}>
              {index > 0 && <View style={styles.divider} />}
              <ODRequestListItem
                request={request}
                onPress={() =>
                  router.push(`/(student)/od/${request.id}` as Href)
                }
              />
            </View>
          ))
        )}
      </View>

      <View style={[styles.devStatus, { marginBottom: insets.bottom + spacing.md }]}>
        {isCheckingHealth && (
          <View style={styles.devRow}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.devText}>Connecting to backend...</Text>
          </View>
        )}
        {connectionOk && (
          <View style={styles.devRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={styles.devText}>
              Backend connected ({healthCheck.environment})
              {useEmulators ? ` · ${emulatorHost}` : ''}
            </Text>
          </View>
        )}
        {connectionFailed && (
          <View style={styles.devRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
            <Text style={styles.devText}>
              Backend offline — start emulators (npm run emulators)
              {useEmulators && emulatorHost ? ` · trying ${emulatorHost}` : ''}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroGreeting: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  brand: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  notifButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyCaption: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  devStatus: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  devText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
