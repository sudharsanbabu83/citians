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
import { EventListItem } from '@/src/components/EventListItem';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useMyEvents } from '@/src/hooks/useEvents';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, spacing } from '@/src/theme';

export default function MyEventsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const bottomPadding = useBottomContentPadding();
  const { data: events = [], isLoading, isError, refetch, isRefetching } = useMyEvents(user?.uid);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
    >
      <View style={[styles.card, styles.cardShadow]}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : isError ? (
          <Text style={styles.errorText}>Could not load your events.</Text>
        ) : events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="create-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No events hosted yet</Text>
            <Pressable
              style={styles.createButton}
              onPress={() => router.push('/(student)/events/create' as Href)}
            >
              <Text style={styles.createButtonText}>Create your first event</Text>
            </Pressable>
          </View>
        ) : (
          events.map((event, index) => (
            <View key={event.id}>
              {index > 0 && <View style={styles.divider} />}
              <EventListItem
                event={event}
                onPress={() => router.push(`/(student)/events/${event.id}` as Href)}
              />
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
  content: { padding: spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.border },
  loader: { paddingVertical: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyTitle: { ...theme.typography.heading },
  createButton: {
    marginTop: spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createButtonText: { color: theme.colors.white, fontWeight: '600' },
  errorText: { color: theme.colors.error, textAlign: 'center', padding: spacing.md },
});
