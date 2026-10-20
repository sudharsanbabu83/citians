import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useDoubt, useDoubtBranches, useDoubtMutations } from '@/src/hooks/useDoubts';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import { BRANCH_ANGLES, formatDoubtTime, getAngleMeta, getCategoryMeta, type BranchAngle } from '@/src/lib/doubts';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

export default function DoubtDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.xl });
  const user = useAuthStore((state) => state.user);
  const roleProfile = useAuthStore((state) => state.roleProfile);
  const requireLogin = useLoginRequired();
  const { data: doubt, isLoading } = useDoubt(id);
  const { data: branches = [], isLoading: branchesLoading, refetch } = useDoubtBranches(id);
  const { addBranch, helpful } = useDoubtMutations();
  const [angle, setAngle] = useState<BranchAngle>('SIMPLE');
  const [body, setBody] = useState('');
  const [answerOpen, setAnswerOpen] = useState(false);
  const [demoHelpful, setDemoHelpful] = useState<string[]>([]);

  const sortedBranches = useMemo(() => [...branches].sort((a, b) => b.helpfulByUserIds.length - a.helpfulByUserIds.length), [branches]);
  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!doubt) return <View style={styles.center}><Text style={styles.emptyTitle}>This doubt has faded away.</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Return to exchange</Text></Pressable></View>;
  const category = getCategoryMeta(doubt.category);
  const isDemo = id.startsWith('demo-');

  const submitBranch = async () => {
    if (!requireLogin('grow an answer branch')) return;
    if (!user || roleProfile?.type !== 'STUDENT' || body.trim().length < 15) {
      if (body.trim().length < 15) Alert.alert('Add a little more', 'Give the student enough detail to follow your thinking.');
      return;
    }
    if (isDemo) { setBody(''); setAnswerOpen(false); Alert.alert('Preview branch', 'Looks good. Connect Firebase to publish this branch to campus.'); return; }
    try {
      await addBranch.mutateAsync([id, { userId: user.uid, departmentName: roleProfile.departmentName }, angle, body]);
      setBody(''); setAnswerOpen(false); await refetch();
    } catch (error) { Alert.alert('Could not add branch', error instanceof Error ? error.message : 'Try again.'); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={[styles.rootCard, { borderTopColor: category.color }]}>
        <View style={styles.rootTop}>
          <View style={[styles.category, { backgroundColor: category.soft }]}><Text>{category.emoji}</Text><Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text></View>
          <View style={styles.anonBadge}><Ionicons name="shield-checkmark" size={14} color={colors.success} /><Text style={styles.anonText}>Anonymous</Text></View>
        </View>
        <Text style={styles.title}>{doubt.title}</Text>
        <Text style={styles.context}>{doubt.context}</Text>
        <View style={styles.author}><View style={[styles.dot, { backgroundColor: category.color }]} /><Text style={styles.alias}>{doubt.authorAlias}</Text><Text style={styles.meta}> · {doubt.departmentName} · {formatDoubtTime(doubt.createdAt)}</Text></View>
        <View style={styles.needsRow}>
          {doubt.helpModes.filter((mode) => mode !== 'LIVE_SESSION').map((mode) => <View key={mode} style={styles.need}><Text style={styles.needText}>{mode === 'EXPLAIN' ? '✨ Explain' : mode === 'EXAMPLE' ? '🧪 Example' : '🧰 Resource'}</Text></View>)}
        </View>
      </View>

      <View style={styles.branchHeading}>
        <View><Text style={styles.branchEyebrow}>THE ANSWER TREE</Text><Text style={styles.branchTitle}>{branches.length} distinct {branches.length === 1 ? 'branch' : 'branches'}</Text></View>
        <Pressable onPress={() => setAnswerOpen((value) => !value)} style={styles.branchButton}><Ionicons name={answerOpen ? 'close' : 'git-branch'} size={17} color={colors.white} /><Text style={styles.branchButtonText}>{answerOpen ? 'Close' : 'Grow a branch'}</Text></Pressable>
      </View>

      {answerOpen ? <View style={styles.composer}>
        <Text style={styles.composerLabel}>Choose your angle</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.angleRow}>
          {BRANCH_ANGLES.map((item) => { const meta = getAngleMeta(item); const active = item === angle; return <Pressable key={item} onPress={() => setAngle(item)} style={[styles.angle, active && { backgroundColor: meta.color, borderColor: meta.color }]}><Text style={styles.angleEmoji}>{meta.emoji}</Text><Text style={[styles.angleText, active && { color: '#FFFFFF' }]}>{meta.label}</Text></Pressable>; })}
        </ScrollView>
        <TextInput multiline value={body} onChangeText={setBody} maxLength={1000} placeholder="Explain it like you wish someone had explained it to you…" placeholderTextColor={colors.textMuted} style={styles.answerInput} />
        <View style={styles.publishRow}><Text style={styles.publishHint}>{body.length}/1000 · You get an alias too</Text><Pressable disabled={addBranch.isPending} onPress={() => void submitBranch()} style={styles.publishButton}>{addBranch.isPending ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.publishText}>Publish branch</Text><Ionicons name="paper-plane" size={16} color={colors.white} /></>}</Pressable></View>
      </View> : null}

      {branchesLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} /> : sortedBranches.length === 0 ? <View style={styles.noBranches}><Text style={styles.noBranchesEmoji}>🌱</Text><Text style={styles.emptyTitle}>This tree needs its first branch</Text><Text style={styles.emptyText}>You do not need the perfect answer — just a useful angle.</Text></View> : sortedBranches.map((branch, index) => {
        const branchMeta = getAngleMeta(branch.angle); const locallyHelpful = demoHelpful.includes(branch.id); const helpfulActive = locallyHelpful || Boolean(user && branch.helpfulByUserIds.includes(user.uid));
        return <View key={branch.id} style={styles.branchWrap}>
          <View style={[styles.branchLine, { backgroundColor: branchMeta.color }]} />
          <View style={[styles.branchCard, index === 0 && styles.topBranch]}>
            <View style={styles.branchTop}><View style={[styles.branchType, { backgroundColor: `${branchMeta.color}18` }]}><Text>{branchMeta.emoji}</Text><Text style={[styles.branchTypeText, { color: branchMeta.color }]}>{branchMeta.label}</Text></View>{index === 0 ? <View style={styles.topBadge}><Ionicons name="sparkles" size={12} color={colors.warning} /><Text style={styles.topText}>Most useful</Text></View> : null}</View>
            <Text style={styles.branchBody}>{branch.body}</Text>
            <View style={styles.branchFooter}><Text style={styles.branchAuthor}>{branch.authorAlias} · {branch.departmentName}</Text><Pressable onPress={() => {
              if (!requireLogin('mark a branch helpful') || !user) return;
              if (isDemo) { setDemoHelpful((current) => current.includes(branch.id) ? current.filter((value) => value !== branch.id) : [...current, branch.id]); return; }
              void helpful.mutateAsync([branch.id, user.uid, helpfulActive]).then(() => refetch());
            }} style={[styles.helpfulButton, helpfulActive && styles.helpfulActive]}><Ionicons name={helpfulActive ? 'heart' : 'heart-outline'} size={16} color={helpfulActive ? colors.secondary : colors.textMuted} /><Text style={[styles.helpfulText, helpfulActive && { color: colors.secondary }]}>{branch.helpfulByUserIds.length + (locallyHelpful ? 1 : 0)} helpful</Text></Pressable></View>
          </View>
        </View>;
      })}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: spacing.md }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: spacing.xl },
  rootCard: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, borderTopWidth: 6, padding: spacing.lg, ...theme.shadows.card }, rootTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.full }, categoryText: { fontSize: 12, fontWeight: '900' }, anonBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 }, anonText: { color: theme.colors.success, fontSize: 11, fontWeight: '800' },
  title: { ...theme.typography.display, fontSize: 27, lineHeight: 31, marginTop: spacing.md }, context: { ...theme.typography.body, fontSize: 15, lineHeight: 23, color: theme.colors.textMuted, marginTop: spacing.sm }, author: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }, dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, alias: { color: theme.colors.text, fontSize: 12, fontFamily: fontFamilies.bold }, meta: { color: theme.colors.textMuted, fontFamily: fontFamilies.body, fontSize: 12 }, needsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }, need: { backgroundColor: theme.colors.inputBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: borderRadius.full }, needText: { color: theme.colors.textMuted, fontSize: 11, fontFamily: fontFamilies.semibold },
  liveCard: { backgroundColor: theme.colors.errorBg, borderWidth: 1, borderColor: theme.isDark ? '#6B3150' : '#FFC8D8', borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md }, liveHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, liveIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }, liveTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 15 }, liveSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }, meter: { height: 7, borderRadius: 4, backgroundColor: theme.colors.surface, overflow: 'hidden', marginTop: spacing.md }, meterFill: { height: 7, borderRadius: 4, backgroundColor: theme.colors.secondary }, liveButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, supportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.secondary, borderRadius: borderRadius.full, paddingVertical: 10 }, supportButtonActive: { backgroundColor: theme.colors.secondary }, supportText: { color: theme.colors.secondary, fontWeight: '900', fontSize: 12 }, supportTextActive: { color: theme.colors.white }, hostButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg }, hostText: { color: theme.colors.white, fontWeight: '900', fontSize: 12 },
  branchHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md }, branchEyebrow: { color: theme.colors.success, fontSize: 10, letterSpacing: 1.2, fontFamily: fontFamilies.mono }, branchTitle: { ...theme.typography.displaySmall, fontSize: 20, marginTop: 3 }, branchButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 10 }, branchButtonText: { color: theme.colors.white, fontSize: 12, fontFamily: fontFamilies.bold },
  composer: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.accentBorder, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.lg }, composerLabel: { color: theme.colors.text, fontWeight: '900', marginBottom: spacing.sm }, angleRow: { gap: 7, paddingBottom: spacing.md }, angle: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 7 }, angleEmoji: { fontSize: 13 }, angleText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800' }, answerInput: { minHeight: 125, textAlignVertical: 'top', backgroundColor: theme.colors.inputBg, color: theme.colors.text, padding: spacing.md, borderRadius: borderRadius.md, fontSize: 14, lineHeight: 21 }, publishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }, publishHint: { color: theme.colors.textMuted, fontSize: 10 }, publishButton: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 10 }, publishText: { color: theme.colors.white, fontWeight: '900', fontSize: 12 },
  branchWrap: { flexDirection: 'row', paddingLeft: spacing.sm, marginBottom: spacing.md }, branchLine: { width: 4, borderRadius: 2, marginRight: spacing.sm }, branchCard: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md }, topBranch: { borderColor: theme.colors.warning }, branchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, branchType: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: borderRadius.full }, branchTypeText: { fontSize: 11, fontWeight: '900' }, topBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 }, topText: { color: theme.colors.warning, fontSize: 10, fontWeight: '900' }, branchBody: { color: theme.colors.text, fontSize: 14, lineHeight: 22, marginTop: spacing.md }, branchFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }, branchAuthor: { color: theme.colors.textMuted, fontSize: 10, flex: 1 }, helpfulButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.inputBg, paddingHorizontal: 9, paddingVertical: 6, borderRadius: borderRadius.full }, helpfulActive: { backgroundColor: theme.colors.errorBg }, helpfulText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '800' },
  noBranches: { alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border, padding: spacing.xl }, noBranchesEmoji: { fontSize: 32 }, emptyTitle: { ...theme.typography.heading, textAlign: 'center', marginTop: spacing.sm }, emptyText: { ...theme.typography.caption, textAlign: 'center', marginTop: 5 }, link: { color: theme.colors.link, fontWeight: '800', marginTop: spacing.md },
});
