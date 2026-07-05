import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMarkNotificationRead } from '@/src/hooks/useMarkNotificationRead';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  formatNotificationTime,
  type NotificationWithId,
} from '@/src/lib/notifications';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

function getNotificationIcon(type: NotificationWithId['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'OD_APPROVED':
    case 'OD_PASS_GENERATED':
      return 'checkmark-circle-outline';
    case 'OD_REJECTED':
      return 'close-circle-outline';
    case 'OD_CHANGES_REQUESTED':
      return 'create-outline';
    case 'OD_SUBMITTED':
      return 'document-text-outline';
    default:
      return 'notifications-outline';
  }
}

function getNotificationRoute(
  notification: NotificationWithId,
  role: 'STUDENT' | 'HOD' | 'ADMIN' | undefined
): Href | null {
  if (notification.entityType !== 'odRequests') return null;

  if (role === 'HOD') {
    return `/(hod)/od/${notification.entityId}` as Href;
  }
  if (role === 'STUDENT') {
    return `/(student)/od/${notification.entityId}` as Href;
  }
  return null;
}

export function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const { data: notifications = [], isLoading, isError, refetch, isRefetching } =
    useNotifications(user?.uid);
  const markRead = useMarkNotificationRead(user?.uid);

  const onPressNotification = async (notification: NotificationWithId) => {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Continue navigation even if mark-read fails.
      }
    }

    const route = getNotificationRoute(notification, profile?.role);
    if (route) {
      router.push(route);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={styles.errorTitle}>Could not load notifications</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.linkText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
      data={notifications}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyCaption}>
            Updates about your OD requests will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, shadows.card, !item.isRead && styles.unreadCard]}
          onPress={() => onPressNotification(item)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={getNotificationIcon(item.type)} size={22} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  unreadTitle: { fontWeight: '800' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  body: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.heading, marginTop: spacing.sm },
  emptyCaption: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
  errorTitle: { ...typography.heading, marginTop: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
});
