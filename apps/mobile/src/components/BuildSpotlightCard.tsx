import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WorkPostWithId } from '@campusflow/shared';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import {
  getHypeCount,
  getWorkPostCategoryMeta,
  getWorkProgressMeta,
  hasUserHyped,
} from '@/src/lib/workPosts';
import { borderRadius, spacing } from '@/src/theme';

interface BuildSpotlightCardProps {
  post: WorkPostWithId;
  currentUserId?: string;
  onHype?: () => void;
  onShare?: () => void;
  hypePending?: boolean;
}

export function BuildSpotlightCard({
  post,
  currentUserId,
  onHype,
  onShare,
  hypePending,
}: BuildSpotlightCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const category = getWorkPostCategoryMeta(post.category, isDark);
  const progress = getWorkProgressMeta(post.progressStatus, isDark);
  const hype = getHypeCount(post);
  const hyped = hasUserHyped(post, currentUserId);
  const isOwn = post.studentUserId === currentUserId;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Featured build</Text>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {post.description}
      </Text>
      <Text style={styles.meta}>
        {post.studentName} · {category.label} · {progress.label}
      </Text>

      <View style={styles.footer}>
        <Pressable
          style={styles.action}
          onPress={onHype}
          disabled={!onHype || hypePending || isOwn}
          hitSlop={6}
        >
          <Ionicons
            name={hyped ? 'flame' : 'flame-outline'}
            size={18}
            color={hyped ? colors.link : colors.textMuted}
          />
          <Text style={[styles.actionText, hyped && styles.actionTextActive]}>
            {hype > 0 ? hype : 'Hype'}
          </Text>
        </Pressable>
        {onShare ? (
          <Pressable style={styles.action} onPress={onShare} hitSlop={6}>
            <Ionicons name="share-outline" size={18} color={colors.textMuted} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.link,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: spacing.xs,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: 4,
    },
    description: {
      fontSize: 13,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    meta: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: spacing.sm,
    },
    footer: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    actionTextActive: {
      color: theme.colors.link,
    },
  });
