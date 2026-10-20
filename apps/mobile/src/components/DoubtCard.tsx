import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { formatDoubtTime, getCategoryMeta, type Doubt } from '@/src/lib/doubts';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

export function DoubtCard({ doubt, onPress }: { doubt: Doubt; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const category = getCategoryMeta(doubt.category);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderLeftColor: category.color }, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={[styles.category, { backgroundColor: category.soft }]}>
          <Text style={styles.categoryEmoji}>{category.emoji}</Text>
          <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
        </View>
        <Text style={styles.time}>{formatDoubtTime(doubt.createdAt)}</Text>
      </View>

      <Text style={styles.title}>{doubt.title}</Text>
      <Text numberOfLines={2} style={styles.context}>{doubt.context}</Text>

      <View style={styles.authorRow}>
        <View style={[styles.aliasDot, { backgroundColor: category.color }]} />
        <Text style={styles.alias}>{doubt.authorAlias}</Text>
        <Text style={styles.meta}> · {doubt.departmentName} · Year {doubt.year}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.metric}>
          <Ionicons name="git-branch-outline" size={17} color={colors.primary} />
          <Text style={styles.metricStrong}>{doubt.branchCount}</Text>
          <Text style={styles.metricText}>{doubt.branchCount === 1 ? 'branch' : 'branches'}</Text>
        </View>
        <View style={styles.openBadge}><Text style={styles.openText}>Open to ideas</Text></View>
        <Ionicons name="arrow-forward-circle" size={24} color={category.color} />
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 5,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...theme.shadows.card,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  categoryEmoji: { fontSize: 13 },
  categoryText: { fontSize: 12, fontWeight: '800' },
  time: { ...theme.typography.caption },
  title: { ...theme.typography.displaySmall, fontSize: 19, lineHeight: 24, marginTop: spacing.sm },
  context: { ...theme.typography.body, color: theme.colors.textMuted, lineHeight: 20, marginTop: 5 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  aliasDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  alias: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  meta: { color: theme.colors.textMuted, fontSize: 12, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, gap: spacing.sm },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricStrong: { color: theme.colors.text, fontFamily: fontFamilies.mono, fontSize: 12 },
  metricText: { color: theme.colors.textMuted, fontSize: 12 },
  liveMetric: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: theme.colors.errorBg, paddingVertical: 6, paddingHorizontal: 9, borderRadius: borderRadius.full },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.error },
  liveText: { color: theme.colors.error, fontWeight: '800', fontSize: 11 },
  openBadge: { flex: 1, alignItems: 'center' },
  openText: { color: theme.colors.success, fontSize: 11, fontWeight: '800' },
});
