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

import { HodPendingListItem } from '@/src/components/HodPendingListItem';
import { useHodPendingCount } from '@/src/hooks/useHodPendingCount';
import { useHodPendingRequests } from '@/src/hooks/useHodPendingRequests';
import { useUnreadNotificationCount } from '@/src/hooks/useNotifications';
import { getFirstName } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function HodHomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const firstName = profile ? getFirstName(profile.name) : 'HOD';
  const departmentName =
    roleProfile?.type === 'HOD' ? roleProfile.departmentName : 'Your department';
  const departmentId =
    roleProfile?.type === 'HOD' ? roleProfile.data.departmentId : undefined;

  const {
    data: pendingCount = 0,
    isLoading: countLoading,
    isError: countError,
    refetch: refetchCount,
    isRefetching: countRefetching,
  } = useHodPendingCount(departmentId);

  const {
    data: pendingRequests = [],
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
    isRefetching: listRefetching,
  } = useHodPendingRequests(departmentId);

  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.uid);

  const isRefetching = countRefetching || listRefetching;
  const refetch = () => {
    refetchCount();
    refetchList();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={[styles.heroBanner, shadows.hero]}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroGreeting}>Welcome, {firstName}</Text>
            <Text style={styles.heroTitle}>HOD Dashboard</Text>
            <Text style={styles.heroSubtitle}>{departmentName}</Text>
          </View>
          <Pressable
            style={styles.notifButton}
            onPress={() => router.push('/(hod)/notifications' as Href)}
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
      </View>

      <Text style={styles.sectionLabel}>Review queue</Text>
      {!departmentId && profile?.role === 'HOD' ? (
        <View style={[styles.card, shadows.card, styles.errorWrap]}>
          <Text style={styles.errorText}>
            HOD department profile is missing. Run the emulator seed script and sign in again.
          </Text>
        </View>
      ) : (
      <View style={[styles.card, shadows.card]}>
        {countLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : countError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>Could not load pending reviews.</Text>
            <Pressable onPress={refetch}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.statRow}>
            <View style={[styles.statIcon, { backgroundColor: colors.warningBg }]}>
              <Ionicons name="hourglass-outline" size={24} color={colors.warning} />
            </View>
            <View style={styles.statText}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending reviews</Text>
            </View>
          </View>
        )}
      </View>
      )}

      <Text style={styles.sectionLabel}>Pending requests</Text>
      <View style={[styles.card, shadows.card]}>
        {listLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : listError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>Could not load requests.</Text>
            <Pressable onPress={refetch}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={32} color={colors.success} />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyCaption}>No OD requests waiting for your review.</Text>
          </View>
        ) : (
          pendingRequests.map((request, index) => (
            <View key={request.id}>
              {index > 0 && <View style={styles.divider} />}
              <HodPendingListItem
                request={request}
                onPress={() =>
                  router.push(`/(hod)/od/${request.id}` as Href)
                }
              />
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionLabel}>Verify passes</Text>
      <Pressable
        style={[styles.scanButton, shadows.card]}
        onPress={() => router.push('/(hod)/scan' as Href)}
      >
        <View style={styles.scanIconWrap}>
          <Ionicons name="qr-code-outline" size={24} color={colors.white} />
        </View>
        <View style={styles.scanTextWrap}>
          <Text style={styles.scanTitle}>Scan OD Pass</Text>
          <Text style={styles.scanSubtitle}>Verify a student&apos;s digital QR pass</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  heroBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroTextWrap: { flex: 1 },
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
  heroGreeting: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  errorWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  scanIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextWrap: { flex: 1 },
  scanTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  scanSubtitle: { fontSize: 13, color: colors.textMuted },
});
