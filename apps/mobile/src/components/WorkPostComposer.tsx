import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTheme } from '@/src/lib/themeStore';import type { WorkPostCategory, WorkPostWithId, WorkProgressStatus } from '@campusflow/shared';
import { WORK_POST_CATEGORIES, WORK_PROGRESS_STATUSES } from '@campusflow/shared';

import {
  getWorkPostCategoryMeta,
  getWorkProgressMeta,
  type CreateWorkPostInput,
} from '@/src/lib/workPosts';
import { borderRadius, spacing } from '@/src/theme';

const SUGGESTED_TAGS = ['React Native', 'Firebase', 'ML', 'Hackathon', 'Portfolio', 'Startup'];

interface WorkPostComposerProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateWorkPostInput) => Promise<void>;
  isSubmitting?: boolean;
  initialPost?: WorkPostWithId | null;
}

export function WorkPostComposer({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  initialPost,
}: WorkPostComposerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkPostCategory>('WEB');
  const [progressStatus, setProgressStatus] = useState<WorkProgressStatus>('IN_PROGRESS');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [lookingForHelp, setLookingForHelp] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialPost?.title ?? '');
    setDescription(initialPost?.description ?? '');
    setCategory(initialPost?.category ?? 'WEB');
    setProgressStatus(initialPost?.progressStatus ?? 'IN_PROGRESS');
    setTags(initialPost?.tags ?? []);
    setTagInput('');
    setLookingForHelp(initialPost?.lookingForHelp ?? false);
  }, [visible, initialPost]);

  const canSubmit = useMemo(
    () => title.trim().length >= 3 && description.trim().length >= 10 && !isSubmitting,
    [title, description, isSubmitting]
  );

  const addTag = (value: string) => {
    const normalized = value.trim().replace(/^#/, '');
    if (!normalized || tags.length >= 3) return;
    if (tags.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) return;
    setTags((current) => [...current, normalized]);
    setTagInput('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      progressStatus,
      tags,
      lookingForHelp,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {initialPost ? 'Update build' : 'Share your build'}
          </Text>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={8}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={[styles.postText, !canSubmit && styles.postTextDisabled]}>
                {initialPost ? 'Save' : 'Post'}
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🛠️</Text>
            <Text style={styles.heroTitle}>
              What are you building right now?
            </Text>
            <Text style={styles.heroCaption}>
              Share your project, progress, and vibe. Get on the leaderboard, earn hype, and find teammates who get it.
            </Text>
          </View>

          <Text style={styles.label}>Project title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. AI timetable generator for CIT"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
          />

          <Text style={styles.label}>What&apos;s the update?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell people what you're working on, what you've done, and what's next..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{description.length}/500</Text>

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {WORK_POST_CATEGORIES.map((item) => {
              const meta = getWorkPostCategoryMeta(item, isDark);
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.chip, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={styles.chipEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.chipText, active && { color: meta.color }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Progress</Text>
          <View style={styles.progressGrid}>
            {WORK_PROGRESS_STATUSES.map((item) => {
              const meta = getWorkProgressMeta(item, isDark);
              const active = progressStatus === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.progressChip, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                  onPress={() => setProgressStatus(item)}
                >
                  <Text style={styles.progressEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.progressText, active && { color: meta.color }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Tags (optional)</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, styles.tagInput]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add a tag"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => addTag(tagInput)}
              returnKeyType="done"
              maxLength={24}
            />
            <Pressable
              style={[styles.addTagButton, tags.length >= 3 && styles.addTagButtonDisabled]}
              onPress={() => addTag(tagInput)}
              disabled={tags.length >= 3}
            >
              <Ionicons name="add" size={20} color={colors.white} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedScroll}>
            {SUGGESTED_TAGS.map((tag) => (
              <Pressable key={tag} style={styles.suggestedTag} onPress={() => addTag(tag)}>
                <Text style={styles.suggestedTagText}>#{tag}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {tags.length > 0 ? (
            <View style={styles.selectedTags}>
              {tags.map((tag) => (
                <Pressable key={tag} style={styles.selectedTag} onPress={() => setTags((current) => current.filter((t) => t !== tag))}>
                  <Text style={styles.selectedTagText}>#{tag}</Text>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.helpRow}>
            <View style={styles.helpCopy}>
              <Text style={styles.helpTitle}>Looking for collaborators?</Text>
              <Text style={styles.helpCaption}>Show a badge so others know you could use a hand.</Text>
            </View>
            <Switch
              value={lookingForHelp}
              onValueChange={setLookingForHelp}
              trackColor={{ false: colors.border, true: colors.accentBorder }}
              thumbColor={lookingForHelp ? colors.primary : colors.surface}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    ...theme.typography.heading,
  },
  postText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  postTextDisabled: {
    opacity: 0.4,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroEmoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroCaption: {
    color: theme.colors.accentBorder,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    ...theme.typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  counter: {
    ...theme.typography.caption,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  chipScroll: {
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: spacing.sm,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  progressEmoji: {
    fontSize: 16,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    opacity: 0.4,
  },
  suggestedScroll: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  suggestedTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.accentBg,
    marginRight: spacing.xs,
  },
  suggestedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helpCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  helpTitle: {
    ...theme.typography.heading,
    fontSize: 15,
  },
  helpCaption: {
    ...theme.typography.caption,
    marginTop: 4,
  },
});
