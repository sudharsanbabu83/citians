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

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { useMarkNotificationRead } from '@/src/hooks/useMarkNotificationRead';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  formatNotificationTime,
  type NotificationWithId,
} from '@/src/lib/notifications';
import { useAuthStore } from '@/src/lib/authStore';
import type { Role } from '@campusflow/shared';
import { borderRadius, spacing } from '@/src/theme';

function getNotificationIcon(type: NotificationWithId['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'EVENT_ANNOUNCEMENT':
      return 'radio-outline';
    default:
      return 'notifications-outline';
  }
}

function getNotificationRoute(
  notification: NotificationWithId,
  role: Role | undefined
): Href | null {
  if (notification.entityType === 'eventAnnouncements' && role === 'STUDENT') {
    return `/(student)/events/${notification.entityId}/announcements` as Href;
  }
  return null;
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const { data: notifications = [], isLoading, isError, refetch, isRefetching } =
    useNotifications(user?.uid);
  const visibleNotifications = notifications.filter((notification) => notification.entityType !== 'canvasDrops');
  const markRead = useMarkNotificationRead(user?.uid);
  const bottomPadding = useBottomContentPadding();

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
      contentContainerStyle={
        notifications.length === 0
          ? [styles.emptyContainer, { paddingBottom: bottomPadding }]
          : [styles.listContent, { paddingBottom: bottomPadding }]
      }
      data={visibleNotifications}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyCaption}>
            Updates about events, learning, and campus activity will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, styles.cardShadow, !item.isRead && styles.unreadCard]}
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: theme.colors.background,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  unreadTitle: { fontWeight: '800' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  body: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  time: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...theme.typography.heading, marginTop: spacing.sm },
  emptyCaption: { ...theme.typography.caption, textAlign: 'center', lineHeight: 20 },
  errorTitle: { ...theme.typography.heading, marginTop: spacing.sm },
  linkText: { color: theme.colors.primary, fontWeight: '600', marginTop: spacing.sm },
});
