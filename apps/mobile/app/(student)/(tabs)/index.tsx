import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';


import { DoubtCard } from '@/src/components/DoubtCard';
import { EventListItem } from '@/src/components/EventListItem';
import { DailySparkCard } from '@/src/components/DailySparkCard';
import { OpeningSpotlightModal } from '@/src/components/OpeningSpotlightModal';
import { StudentWelcomeMoment } from '@/src/components/StudentWelcomeMoment';
import { TechPulsePreview } from '@/src/components/TechPulseFeed';
import { useEmulators, resolvedEmulatorHost, getEmulatorHost } from '@/src/config/firebase';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useDoubts } from '@/src/hooks/useDoubts';
import { useEvents } from '@/src/hooks/useEvents';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { useAppStore } from '@/src/lib/store';
import { DEMO_DOUBTS, getDoubtAlias } from '@/src/lib/doubts';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

type FeedFilter = 'DOUBTS' | 'EVENTS';

const FEED_FILTERS: Array<{ key: FeedFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'DOUBTS', label: 'Doubt Exchange', icon: 'git-branch-outline' },
  { key: 'EVENTS', label: 'Events', icon: 'calendar-outline' },
];

export default function StudentHomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.md, includeTabBar: true });
  const responsive = useResponsiveLayout();
  const { healthCheck, healthError, isCheckingHealth } = useAppStore();
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const user = useAuthStore((s) => s.user);
  const requireLogin = useLoginRequired();

  const departmentId = roleProfile?.type === 'STUDENT' ? roleProfile.data.departmentId : undefined;

  const [feedFilter, setFeedFilter] = useState<FeedFilter>('DOUBTS');
  const {
    data: doubtPosts = [],
    isLoading: doubtsLoading,
    isError: doubtsError,
    refetch: refetchDoubts,
    isRefetching: doubtsRefetching,
  } = useDoubts('PULSE', departmentId);

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
    isRefetching: eventsRefetching,
  } = useEvents('ALL');

  const connectionOk = !isCheckingHealth && !!healthCheck;
  const connectionFailed = !isCheckingHealth && !!healthError;
  const emulatorHost = resolvedEmulatorHost ?? (useEmulators ? getEmulatorHost() : null);

  const feedDoubts = __DEV__ && (doubtsError || (!doubtsLoading && doubtPosts.length === 0)) ? DEMO_DOUBTS.slice(0, 2) : doubtPosts.slice(0, 4);

  const isRefreshing = doubtsRefetching || eventsRefetching;
  const isFeedLoading = feedFilter === 'DOUBTS' ? doubtsLoading : eventsLoading;
  const isFeedError = feedFilter === 'DOUBTS' ? false : eventsError;

  const handleRefresh = useCallback(() => {
    refetchDoubts();
    refetchEvents();
  }, [refetchDoubts, refetchEvents]);

  return (
    <View style={styles.container}>
      <OpeningSpotlightModal />
      <ScrollView
        contentContainerStyle={[styles.content, responsive.readableContentStyle, { paddingBottom: bottomPadding, paddingHorizontal: responsive.gutter }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        <StudentWelcomeMoment
          onAction={(momentId) => {
            const route = momentId === 'next-step'
              ? '/(student)/(tabs)/build'
              : momentId === 'build-together'
                ? '/(student)/network'
                : momentId === 'tiny-win'
                  ? '/(student)/leetcode'
                  : '/(student)/focus-blocker';
            router.push(route as Href);
          }}
        />

        <DailySparkCard />

        <Pressable
            style={styles.composePrompt}
            onPress={() => {
              if (requireLogin('drop an anonymous doubt')) {
                router.push('/(student)/(tabs)/build' as Href);
              }
            }}
          >
            <View style={styles.composerAvatar}>
              <Text style={styles.composerAvatarText}>?</Text>
            </View>
            <View style={styles.composePromptField}>
            <Text style={styles.composePromptText}>What are you quietly stuck on?</Text>
            <Text style={styles.composePromptSubtext}>{user ? `Posting as ${getDoubtAlias(user.uid)}` : 'Anonymous campus alias'}</Text>
            </View>
            <Ionicons name="git-branch-outline" size={22} color={colors.link} />
          </Pressable>

        <Pressable
          style={[styles.focusCard, styles.cardShadow]}
          onPress={() => router.push('/(student)/focus-blocker' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Start a focus session"
        >
          <View style={styles.focusIconWrap}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          </View>
          <View style={styles.focusText}>
            <Text style={styles.focusTitle}>Start a focus session</Text>
            <Text style={styles.focusSubtitle}>Block social media and study without distractions</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
        </Pressable>

        <TechPulsePreview onSeeAll={() => router.push('/(student)/tech-pulse' as Href)} />

        <Pressable
          style={[styles.focusCard, styles.cardShadow]}
          onPress={() => router.push('/(student)/leetcode' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Open Code Together"
        >
          <View style={styles.focusIconWrap}>
            <Ionicons name="code-slash" size={24} color={colors.secondary} />
          </View>
          <View style={styles.focusText}>
            <Text style={styles.focusTitle}>Code Together</Text>
            <Text style={styles.focusSubtitle}>Share coding questions, solutions, and helpful ideas</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.secondary} />
        </Pressable>

        <Pressable
          style={[styles.focusCard, styles.cardShadow]}
          onPress={() => router.push('/(student)/network' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Open Campus Network"
        >
          <View style={styles.focusIconWrap}>
            <Ionicons name="people-outline" size={24} color={colors.link} />
          </View>
          <View style={styles.focusText}>
            <Text style={styles.focusTitle}>Campus Network</Text>
            <Text style={styles.focusSubtitle}>Find students, connect, and grow together</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.link} />
        </Pressable>

        <Pressable
          style={[styles.focusCard, styles.cardShadow]}
          onPress={() => router.push('/(student)/network-feed' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Open Network Feed"
        >
          <View style={styles.focusIconWrap}>
            <Ionicons name="newspaper-outline" size={24} color={colors.secondary} />
          </View>
          <View style={styles.focusText}>
            <Text style={styles.focusTitle}>Network Feed</Text>
            <Text style={styles.focusSubtitle}>Share projects, achievements, and opportunities</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.secondary} />
        </Pressable>

        <View style={styles.feedHeading}>
          <Text style={styles.feedTitle}>Recommended for you</Text>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FEED_FILTERS.map((item) => {
            const active = feedFilter === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFeedFilter(item.key)}
              >
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={active ? colors.success : colors.textMuted}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isFeedLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : isFeedError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.errorText}>Could not load the feed.</Text>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : feedFilter === 'DOUBTS' ? (
          feedDoubts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No doubt signals yet</Text>
              <Text style={styles.emptyCaption}>
                Ask what others may be too nervous to say out loud.
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push('/(student)/(tabs)/build' as Href)}
              >
                <Text style={styles.primaryButtonText}>Open Doubt Exchange</Text>
              </Pressable>
            </View>
          ) : (
            feedDoubts.map((doubt) => (
              <DoubtCard key={doubt.id} doubt={doubt} onPress={() => router.push({ pathname: '/(student)/doubts/[id]', params: { id: doubt.id } } as Href)} />
            ))
          )
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No upcoming events</Text>
            <Text style={styles.emptyCaption}>Check back later or browse all events.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/(student)/(tabs)/events' as Href)}
            >
              <Text style={styles.primaryButtonText}>Browse events</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.eventsCard}>
            {events.map((event, index) => (
              <View key={event.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <EventListItem
                  event={event}
                  onPress={() => router.push(`/(student)/events/${event.id}` as Href)}
                />
              </View>
            ))}
          </View>
        )}

        {__DEV__ ? (
          <View style={styles.devStatus}>
            {isCheckingHealth ? (
              <View style={styles.devRow}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.devText}>Connecting to backend...</Text>
              </View>
            ) : null}
            {connectionOk ? (
              <View style={styles.devRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={styles.devText}>
                  Backend connected ({healthCheck.environment})
                  {useEmulators ? ` · ${emulatorHost}` : ''}
                </Text>
              </View>
            ) : null}
            {connectionFailed ? (
              <View style={styles.devRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
                <Text style={styles.devText}>
                  Backend offline — start emulators (npm run emulators)
                  {useEmulators && emulatorHost ? ` · trying ${emulatorHost}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
    },
    feedHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.sm,
    },
    feedTitle: {
      fontSize: 16,
      fontFamily: fontFamilies.display,
      color: theme.colors.text,
    },
    composePrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    focusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.colors.accentBg,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.accentBorder,
    },
    cardShadow: theme.shadows.card,
    focusIconWrap: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    focusText: {
      flex: 1,
    },
    focusTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    focusSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    composerAvatar: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    composerAvatarText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 12,
    },
    composePromptField: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
    },
    composePromptText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '700',
    },
    composePromptSubtext: {
      fontSize: 10,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    filterScroll: {
      marginBottom: spacing.md,
      paddingLeft: spacing.xs,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: spacing.sm,
    },
    filterChipActive: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.success,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    filterTextActive: {
      color: theme.colors.success,
    },
    centered: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: spacing.md,
    },
    emptyTitle: {
      ...theme.typography.heading,
      textAlign: 'center',
    },
    emptyCaption: {
      ...theme.typography.caption,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 14,
    },
    eventsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: spacing.sm,
    },
    errorText: {
      color: theme.colors.error,
      fontWeight: '600',
      textAlign: 'center',
    },
    retryButton: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    retryText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: spacing.xs,
    },
    devStatus: {
      alignItems: 'center',
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
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
      color: theme.colors.textMuted,
    },
  });
