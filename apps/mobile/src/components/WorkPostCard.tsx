import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WorkPostWithId } from '@campusflow/shared';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import {
  formatWorkPostTime,
  getAvatarColor,
  getHypeCount,
  getInitials,
  getWorkPostCategoryMeta,
  getWorkProgressMeta,
  hasUserHyped,
} from '@/src/lib/workPosts';
import { borderRadius, spacing } from '@/src/theme';

interface WorkPostCardProps {
  post: WorkPostWithId;
  currentUserId?: string;
  isOwnPost?: boolean;
  onHype?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  hypePending?: boolean;
}

function buildMetadataLine(
  post: WorkPostWithId,
  isDark: boolean
): string {
  const category = getWorkPostCategoryMeta(post.category, isDark);
  const progress = getWorkProgressMeta(post.progressStatus, isDark);
  const parts = [category.label, progress.label];
  if (post.lookingForHelp) parts.push('Needs help');
  return parts.join(' · ');
}

export function WorkPostCard({
  post,
  currentUserId,
  isOwnPost,
  onHype,
  onShare,
  onEdit,
  hypePending,
}: WorkPostCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const hypeCount = getHypeCount(post);
  const hyped = hasUserHyped(post, currentUserId);
  const metadata = buildMetadataLine(post, isDark);

  return (
    <View style={[styles.card, isOwnPost && styles.ownCard]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(post.studentName) }]}>
          <Text style={styles.avatarText}>{getInitials(post.studentName)}</Text>
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {post.studentName}
            </Text>
            {isOwnPost ? <Text style={styles.ownLabel}>You</Text> : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {post.departmentName} · Year {post.year} · {formatWorkPostTime(post.updatedAt ?? post.createdAt)}
          </Text>
        </View>
        {isOwnPost && onEdit ? (
          <Pressable style={styles.editButton} onPress={onEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ) : <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />}
      </View>

      <Text style={styles.title}>{post.title}</Text>
      {post.experimentId ? (
        <View style={styles.experimentBadge}>
          <Ionicons name="flash" size={12} color={colors.primary} />
          <Text style={styles.experimentBadgeText}>48-hour experiment</Text>
        </View>
      ) : null}
      <Text style={styles.description} numberOfLines={3}>
        {post.description}
      </Text>

      <Text style={styles.metadata}>{metadata}</Text>

      {post.tags.length > 0 ? (
        <Text style={styles.tags} numberOfLines={1}>
          {post.tags.map((tag) => `#${tag}`).join('  ')}
        </Text>
      ) : null}

      {hypeCount > 0 ? (
        <View style={styles.engagementRow}>
          <View style={styles.reactionMark}>
            <Ionicons name="thumbs-up" size={10} color={colors.white} />
          </View>
          <Text style={styles.engagementText}>{hypeCount}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          style={styles.action}
          onPress={onHype}
          disabled={!onHype || hypePending || isOwnPost}
          hitSlop={6}
        >
          <Ionicons
            name={hyped ? 'thumbs-up' : 'thumbs-up-outline'}
            size={19}
            color={hyped ? colors.link : colors.textMuted}
          />
          <Text style={[styles.actionText, hyped && styles.actionTextActive]}>
            Like
          </Text>
        </Pressable>

        {onShare ? (
          <Pressable style={styles.action} onPress={onShare} hitSlop={6}>
            <Ionicons name="share-outline" size={20} color={colors.textMuted} />
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
      backgroundColor: theme.isDark ? theme.colors.background : theme.colors.surface,
      borderRadius: theme.isDark ? 0 : borderRadius.sm,
      padding: spacing.md,
      marginBottom: theme.isDark ? 0 : spacing.sm,
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    ownCard: {
      borderColor: theme.isDark ? theme.colors.link : theme.colors.primary,
      borderWidth: theme.isDark ? 0 : 1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.isDark ? theme.colors.surfaceElevated : theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 14,
    },
    headerText: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      flexShrink: 1,
    },
    ownLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.link,
      backgroundColor: theme.colors.accentBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    meta: {
      ...theme.typography.caption,
      fontSize: 12,
      marginTop: 1,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      lineHeight: 22,
      marginBottom: spacing.xs,
    },
    experimentBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.accentBg,
      borderRadius: borderRadius.full,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginBottom: spacing.xs,
    },
    experimentBadgeText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    description: {
      fontSize: 14,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    metadata: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: spacing.sm,
    },
    tags: {
      fontSize: 12,
      color: theme.colors.link,
      marginTop: spacing.xs,
    },
    engagementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.md,
    },
    reactionMark: {
      width: 16,
      height: 16,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    engagementText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
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
