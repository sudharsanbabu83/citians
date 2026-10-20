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
import type { AppTheme } from '@/src/lib/themeStore';import type { EventType } from '@campusflow/shared';

import { EventListItem } from '@/src/components/EventListItem';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useEvents } from '@/src/hooks/useEvents';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

const FILTERS: Array<{ key: EventType | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'HACKATHON', label: 'Hackathons' },
  { key: 'WORKSHOP', label: 'Workshops' },
  { key: 'EVENT', label: 'Events' },
  { key: 'MEETUP', label: 'Meetups' },
];

export default function EventsBrowseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');
  const requireLogin = useLoginRequired();
  const bottomPadding = useBottomContentPadding({ extra: spacing.md, includeTabBar: true });
  const responsive = useResponsiveLayout();
  const { data: events = [], isLoading, isError, refetch, isRefetching } = useEvents(filter);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, responsive.readableContentStyle, { paddingBottom: bottomPadding, paddingHorizontal: responsive.gutter }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
    >
      <View style={[styles.hero, styles.heroShadow]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>CAMPUS LIVE</Text></View>
          <Ionicons name="sparkles" size={21} color="#FFE27A" />
        </View>
        <Text style={styles.heroTitle}>Find your next room.</Text>
        <Text style={styles.heroCopy}>Join workshops, online sessions and campus experiences without registration chaos.</Text>
        <View style={styles.promiseRow}>
          <Text style={styles.promise}>⚡ instant seats</Text>
          <Text style={styles.promise}>↗ smart waitlist</Text>
          <Text style={styles.promise}>⌁ QR entry</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionEyebrow}>YOUR EVENT DESK</Text><Text style={styles.sectionTitle}>Everything in one place</Text></View>
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionButton, styles.cardShadow]}
          onPress={() => {
            if (requireLogin('create an event')) router.push('/(student)/events/create' as Href);
          }}
        >
          <View style={[styles.actionIcon, styles.createIcon]}><Ionicons name="add" size={20} color="#FFF" /></View>
          <Text style={styles.actionText}>Host</Text><Text style={styles.actionCaption}>Create event</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.cardShadow]}
          onPress={() => {
            if (requireLogin('view your registrations')) {
              router.push('/(student)/events/my-registrations' as Href);
            }
          }}
        >
          <View style={[styles.actionIcon, styles.ticketIcon]}><Ionicons name="ticket-outline" size={19} color="#FFF" /></View>
          <Text style={styles.actionText}>My passes</Text><Text style={styles.actionCaption}>Seats & tickets</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.cardShadow]}
          onPress={() => {
            if (requireLogin('view your events')) router.push('/(student)/events/my-events' as Href);
          }}
        >
          <View style={[styles.actionIcon, styles.manageIcon]}><Ionicons name="options-outline" size={19} color="#FFF" /></View>
          <Text style={styles.actionText}>Manage</Text><Text style={styles.actionCaption}>Host dashboard</Text>
        </Pressable>
      </View>

      <View style={styles.discoverRow}><Text style={styles.sectionTitle}>Discover</Text><Text style={styles.discoverHint}>Seats update live</Text></View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.card, styles.cardShadow]}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Could not load events.</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyCaption}>Be the first to host a hackathon or campus event.</Text>
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
    heroShadow: theme.shadows.hero,
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: '#241C43', borderRadius: 26, padding: 20, minHeight: 210 },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -55, top: -70, backgroundColor: '#6C4CF6', opacity: .75 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,.12)', paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B5E' },
  liveText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#FFF', fontSize: 31, lineHeight: 34, fontFamily: fontFamilies.displayStrong, letterSpacing: -.8, marginTop: 25 },
  heroCopy: { color: '#D9D2F0', fontSize: 13, lineHeight: 19, maxWidth: 290, marginTop: 7 },
  promiseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 17 },
  promise: { color: '#2B2440', fontSize: 9, fontWeight: '900', backgroundColor: '#FFE27A', borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 6 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionEyebrow: { color: theme.colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { color: theme.colors.text, fontSize: 19, fontFamily: fontFamilies.display, marginTop: 3 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 13,
    minHeight: 112,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  createIcon: { backgroundColor: '#6C4CF6' },
  ticketIcon: { backgroundColor: '#F25F5C' },
  manageIcon: { backgroundColor: '#16897C' },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  actionCaption: { color: theme.colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 3 },
  discoverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  discoverHint: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700' },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...theme.typography.heading,
  },
  emptyCaption: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  retryText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
});
