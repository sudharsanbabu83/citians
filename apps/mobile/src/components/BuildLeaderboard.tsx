import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WorkPostWithId } from '@campusflow/shared';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import type { AppTheme } from '@/src/lib/themeStore';
import { getHypeCount, getInitials, getAvatarColor } from '@/src/lib/workPosts';
import { borderRadius, spacing } from '@/src/theme';

interface BuildLeaderboardProps {
  leaders: WorkPostWithId[];
  currentUserId?: string;
  onPressPost?: (post: WorkPostWithId) => void;
}

export function BuildLeaderboard({ leaders, currentUserId, onPressPost }: BuildLeaderboardProps) {
  const styles = useThemedStyles(createStyles);
  if (leaders.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.caption}>Most hyped this week</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {leaders.map((post, index) => {
          const hype = getHypeCount(post);
          const isYou = post.studentUserId === currentUserId;

          return (
            <Pressable
              key={post.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => onPressPost?.(post)}
            >
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(post.studentName) }]}>
                <Text style={styles.avatarText}>{getInitials(post.studentName)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {isYou ? 'You' : post.studentName.split(' ')[0]}
              </Text>
              <Text style={styles.title} numberOfLines={2}>
                {post.title}
              </Text>
              <Text style={styles.hypeCount}>{hype} hype</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    section: {
      marginBottom: spacing.sm,
    },
    caption: {
      ...theme.typography.caption,
      fontSize: 12,
      marginBottom: spacing.sm,
    },
    row: {
      gap: spacing.sm,
      paddingRight: spacing.xs,
    },
    card: {
      width: 132,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      backgroundColor: theme.colors.inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    cardPressed: {
      opacity: 0.9,
    },
    rank: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      marginBottom: spacing.xs,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    avatarText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 12,
    },
    name: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    title: {
      fontSize: 11,
      color: theme.colors.textMuted,
      lineHeight: 15,
      minHeight: 30,
      marginBottom: spacing.xs,
    },
    hypeCount: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });
