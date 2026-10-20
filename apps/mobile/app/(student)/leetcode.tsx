import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { CodingQuestionComposer } from '@/src/components/CodingQuestionComposer';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import type { AppTheme } from '@/src/lib/themeStore';
import {
  addCodingQuestionComment,
  createCodingQuestion,
  deleteCodingQuestion,
  difficultyMeta,
  fetchCodingQuestionComments,
  fetchCodingQuestions,
  flagCodingQuestion,
  formatCodingQuestionTime,
  toggleCodingQuestionLike,
  type CodingDifficulty,
  type CreateCodingQuestionInput,
} from '@/src/lib/codingQuestions';
import type { CodingQuestionCommentWithId, CodingQuestionWithId } from '@campusflow/shared';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

const DIFFICULTIES: CodingDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export default function LeetCodeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.xl });
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const requireLogin = useLoginRequired();
  const [questions, setQuestions] = useState<CodingQuestionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [comments, setComments] = useState<Record<string, CodingQuestionCommentWithId[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { setQuestions(await fetchCodingQuestions()); }
    catch { Alert.alert('Could not load practice posts', 'Please check your connection and try again.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    questions: questions.length,
    solutions: questions.filter((item) => item.solution.length > 20).length,
  }), [questions]);

  const openComposer = () => {
    if (requireLogin('share a coding question')) setComposerOpen(true);
  };

  const submit = async (input: Omit<CreateCodingQuestionInput, 'authorId' | 'authorName'>) => {
    if (!user) return;
    setPending(true);
    try {
      await createCodingQuestion({
        ...input,
        authorId: user.uid,
        authorName: profile?.username?.trim() || 'CIT Student',
      });
      setComposerOpen(false);
      await load(true);
    } catch (error) { Alert.alert('Could not publish question', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setPending(false); }
  };

  const toggleComments = async (questionId: string) => {
    if (expanded === questionId) { setExpanded(null); return; }
    setExpanded(questionId);
    if (comments[questionId]) return;
    try {
      const loaded = await fetchCodingQuestionComments(questionId);
      setComments((current) => ({ ...current, [questionId]: loaded }));
    }
    catch { Alert.alert('Could not load comments', 'Please try again.'); }
  };

  const submitComment = async (questionId: string) => {
    if (!user || !commentText[questionId]?.trim()) return;
    setPending(true);
    try {
      await addCodingQuestionComment({ questionId, authorId: user.uid, authorName: profile?.username?.trim() || 'CIT Student', body: commentText[questionId].trim() });
      setCommentText((current) => ({ ...current, [questionId]: '' }));
      const loaded = await fetchCodingQuestionComments(questionId);
      setComments((current) => ({ ...current, [questionId]: loaded }));
      await load(true);
    } catch (error) { Alert.alert('Could not add comment', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setPending(false); }
  };

  const report = (questionId: string) => {
    if (!user) return;
    const send = async (reason: string) => {
      try { await flagCodingQuestion(questionId, user.uid, reason); Alert.alert('Thanks', 'The post has been sent for review.'); }
      catch (error) { Alert.alert('Could not report post', error instanceof Error ? error.message : 'Please try again.'); }
    };
    Alert.alert('Report question', 'What needs attention?', [
      { text: 'Incorrect or misleading', onPress: () => void send('Incorrect or misleading') },
      { text: 'Inappropriate content', onPress: () => void send('Inappropriate content') },
      { text: 'Spam', onPress: () => void send('Spam') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const remove = (questionId: string) => Alert.alert('Delete this post?', 'It will disappear from the student feed.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteCodingQuestion(questionId); setQuestions((current) => current.filter((item) => item.id !== questionId)); } catch { Alert.alert('Could not delete post', 'Please try again.'); } } },
  ]);

  return <View style={styles.container}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Text style={styles.heroIconText}>{'</>'}</Text></View>
        <Text style={styles.eyebrow}>DAILY PRACTICE, CAMPUS STYLE</Text>
        <Text style={styles.heroTitle}>Code together.</Text>
        <Text style={styles.heroText}>Share a problem, explain the approach that worked, and help the next student get unstuck.</Text>
        <Pressable style={styles.heroButton} onPress={openComposer}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.heroButtonText}>Add a question</Text></Pressable>
      </View>
      <View style={styles.stats}><View><Text style={styles.statNumber}>{stats.questions}</Text><Text style={styles.statLabel}>questions shared</Text></View><View style={styles.statDivider} /><View><Text style={[styles.statNumber, { color: colors.success }]}>{stats.solutions}</Text><Text style={styles.statLabel}>solutions explained</Text></View></View>
      <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>COMMUNITY NOTEBOOK</Text><Text style={styles.sectionTitle}>Latest challenges</Text></View><Ionicons name="code-slash" size={22} color={colors.secondary} /></View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loading} /> : questions.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>🧠</Text><Text style={styles.emptyTitle}>Be the first to share</Text><Text style={styles.emptyText}>Post a problem and the solution you used. Your explanation may become someone else’s breakthrough.</Text><Pressable onPress={openComposer} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Share the first problem</Text></Pressable></View> : questions.map((question) => {
        const meta = difficultyMeta(question.difficulty);
        const liked = Boolean(user && question.likedByUserIds.includes(user.uid));
        const isOwn = user?.uid === question.authorId;
        const expandedComments = expanded === question.id;
        return <View key={question.id} style={styles.card}>
          <View style={styles.cardTop}><View style={[styles.difficulty, { backgroundColor: meta.bg }]}><Text style={[styles.difficultyText, { color: meta.color }]}>{meta.label}</Text></View><Text style={styles.time}>{formatCodingQuestionTime(question.createdAt)}</Text><Pressable onPress={() => isOwn ? remove(question.id) : report(question.id)} hitSlop={8}><Ionicons name={isOwn ? 'trash-outline' : 'flag-outline'} size={18} color={colors.textMuted} /></Pressable></View>
          <Text style={styles.questionTitle}>{question.title}</Text><Text style={styles.author}>by {question.authorName} · {question.language}</Text>
          <Text style={styles.problem} numberOfLines={expandedComments ? undefined : 5}>{question.problemStatement}</Text>
          <View style={styles.solutionHeader}><Ionicons name="checkmark-circle" size={17} color={colors.success} /><Text style={styles.solutionLabel}>Solution that worked</Text></View><Text style={styles.solution} numberOfLines={expandedComments ? undefined : 7}>{question.solution}</Text>
          {question.tags.length > 0 ? <View style={styles.tags}>{question.tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
          <View style={styles.actions}><Pressable style={styles.action} onPress={async () => { if (!user) return; try { await toggleCodingQuestionLike(question, user.uid); setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, likedByUserIds: liked ? item.likedByUserIds.filter((id) => id !== user.uid) : [...item.likedByUserIds, user.uid] } : item)); } catch { Alert.alert('Could not update reaction', 'Please try again.'); } }}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? colors.secondary : colors.textMuted} /><Text style={[styles.actionText, liked && { color: colors.secondary }]}>{question.likedByUserIds.length} helpful</Text></Pressable><Pressable style={styles.action} onPress={() => void toggleComments(question.id)}><Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textMuted} /><Text style={styles.actionText}>{question.commentCount} comments</Text></Pressable></View>
          {expandedComments ? <View style={styles.comments}><Text style={styles.commentsTitle}>Discussion</Text>{comments[question.id]?.map((comment) => <View key={comment.id} style={styles.comment}><Text style={styles.commentAuthor}>{comment.authorName}</Text><Text style={styles.commentBody}>{comment.body}</Text></View>)}<View style={styles.commentComposer}><TextInput value={commentText[question.id] ?? ''} onChangeText={(value) => setCommentText((current) => ({ ...current, [question.id]: value }))} placeholder="Add a helpful note..." placeholderTextColor={colors.textMuted} style={styles.commentInput} maxLength={1000} /><Pressable onPress={() => void submitComment(question.id)} disabled={pending || !commentText[question.id]?.trim()}><Ionicons name="send" size={20} color={colors.primary} /></Pressable></View></View> : null}
        </View>;
      })}
    </ScrollView>
    <CodingQuestionComposer visible={composerOpen} submitting={pending} onClose={() => setComposerOpen(false)} onSubmit={submit} />
  </View>;
}

function QuestionComposer({ visible, submitting, onClose, onSubmit }: { visible: boolean; submitting: boolean; onClose: () => void; onSubmit: (input: Omit<CreateCodingQuestionInput, 'authorId' | 'authorName'>) => Promise<void> }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(''); const [problem, setProblem] = useState(''); const [solution, setSolution] = useState(''); const [language, setLanguage] = useState('JavaScript'); const [difficulty, setDifficulty] = useState<CodingDifficulty>('MEDIUM'); const [tags, setTags] = useState('');
  const canSubmit = title.trim().length >= 3 && problem.trim().length >= 20 && solution.trim().length >= 20 && !submitting;
  const submit = () => { if (!canSubmit) return; void onSubmit({ title: title.trim(), problemStatement: problem.trim(), solution: solution.trim(), language: language.trim() || 'JavaScript', difficulty, tags: tags.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5) }); };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}><Pressable onPress={onClose}><Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text></Pressable><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Share problem</Text><Pressable disabled={!canSubmit} onPress={submit}>{submitting ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: canSubmit ? colors.primary : colors.textMuted, fontWeight: '900' }}>Post</Text>}</Pressable></View><ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled"><Text style={{ color: colors.text, fontWeight: '900', marginBottom: 6 }}>Question title</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Longest substring without repeats" placeholderTextColor={colors.textMuted} style={[inputStyle, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} maxLength={140} /><Text style={{ color: colors.text, fontWeight: '900', marginTop: spacing.md, marginBottom: 6 }}>Problem statement</Text><TextInput multiline value={problem} onChangeText={setProblem} placeholder="Describe the problem and constraints..." placeholderTextColor={colors.textMuted} style={[inputStyle, { height: 130, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} textAlignVertical="top" maxLength={2500} /><Text style={{ color: colors.text, fontWeight: '900', marginTop: spacing.md, marginBottom: 6 }}>Your solution</Text><TextInput multiline value={solution} onChangeText={setSolution} placeholder="Explain the idea, complexity, and include code..." placeholderTextColor={colors.textMuted} style={[inputStyle, { height: 190, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} textAlignVertical="top" maxLength={8000} /><Text style={{ color: colors.text, fontWeight: '900', marginTop: spacing.md, marginBottom: 6 }}>Language</Text><TextInput value={language} onChangeText={setLanguage} placeholder="JavaScript, Python, Java..." placeholderTextColor={colors.textMuted} style={[inputStyle, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} maxLength={40} /><Text style={{ color: colors.text, fontWeight: '900', marginTop: spacing.md, marginBottom: 6 }}>Difficulty</Text><View style={{ flexDirection: 'row', gap: 8 }}>{DIFFICULTIES.map((item) => { const meta = difficultyMeta(item); return <Pressable key={item} onPress={() => setDifficulty(item)} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: borderRadius.full, borderWidth: 1, borderColor: difficulty === item ? meta.color : colors.border, backgroundColor: difficulty === item ? meta.bg : colors.surface }}><Text style={{ color: difficulty === item ? meta.color : colors.textMuted, fontWeight: '800' }}>{meta.label}</Text></Pressable>; })}</View><Text style={{ color: colors.text, fontWeight: '900', marginTop: spacing.md, marginBottom: 6 }}>Tags (comma separated)</Text><TextInput value={tags} onChangeText={setTags} placeholder="arrays, sliding-window" placeholderTextColor={colors.textMuted} style={[inputStyle, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} maxLength={120} /></ScrollView></KeyboardAvoidingView></Modal>;
}

const inputStyle = { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 } as const;

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: spacing.md }, hero: { backgroundColor: theme.isDark ? '#31245E' : '#6046D8', borderRadius: 25, padding: spacing.lg, overflow: 'hidden' }, heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }, heroIconText: { color: '#6046D8', fontFamily: fontFamilies.mono, fontWeight: '900', fontSize: 17 }, eyebrow: { color: '#CFFBF0', fontSize: 10, letterSpacing: 1.2, fontFamily: fontFamilies.mono }, heroTitle: { color: '#FFFFFF', fontSize: 34, fontFamily: fontFamilies.displayStrong, marginTop: 5 }, heroText: { color: '#EFEAFF', fontSize: 14, lineHeight: 20, marginTop: 5 }, heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFFFFF', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 11, marginTop: spacing.lg }, heroButtonText: { color: theme.colors.primary, fontWeight: '900' }, stats: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md }, statNumber: { color: theme.colors.primary, fontSize: 23, fontFamily: fontFamilies.mono }, statLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 }, statDivider: { width: 1, height: 32, backgroundColor: theme.colors.border }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.xl, marginBottom: spacing.md }, sectionEyebrow: { color: theme.colors.secondary, fontSize: 10, letterSpacing: 1.2, fontFamily: fontFamilies.mono }, sectionTitle: { color: theme.colors.text, fontSize: 23, fontFamily: fontFamilies.displayStrong, marginTop: 3 }, loading: { marginVertical: spacing.xl }, empty: { alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.xl }, emptyEmoji: { fontSize: 32 }, emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.sm }, emptyText: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19, marginTop: spacing.xs }, primaryButton: { backgroundColor: theme.colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md }, primaryButtonText: { color: theme.colors.white, fontWeight: '900' }, card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, difficulty: { borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 5 }, difficultyText: { fontSize: 11, fontWeight: '900' }, time: { color: theme.colors.textMuted, fontSize: 11, flex: 1 }, questionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24, marginTop: spacing.md }, author: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 }, problem: { color: theme.colors.text, fontSize: 14, lineHeight: 21, marginTop: spacing.md }, solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }, solutionLabel: { color: theme.colors.success, fontWeight: '900', fontSize: 12 }, solution: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 5 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }, tag: { color: theme.colors.link, backgroundColor: theme.colors.accentBg, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700' }, actions: { flexDirection: 'row', gap: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, marginTop: spacing.md, paddingTop: spacing.sm }, action: { flexDirection: 'row', alignItems: 'center', gap: 5 }, actionText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' }, comments: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }, commentsTitle: { color: theme.colors.text, fontWeight: '900', marginBottom: spacing.sm }, comment: { backgroundColor: theme.colors.inputBg, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.xs }, commentAuthor: { color: theme.colors.primary, fontSize: 11, fontWeight: '900' }, commentBody: { color: theme.colors.text, fontSize: 13, lineHeight: 18, marginTop: 2 }, commentComposer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm }, commentInput: { flex: 1, color: theme.colors.text, minHeight: 42, fontSize: 13 },
});
