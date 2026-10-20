import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/hooks/useTheme';
import { borderRadius, spacing } from '@/src/theme';
import { difficultyMeta, type CodingDifficulty, type CreateCodingQuestionInput } from '@/src/lib/codingQuestions';

const DIFFICULTIES: CodingDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export function CodingQuestionComposer({ visible, submitting, onClose, onSubmit }: { visible: boolean; submitting: boolean; onClose: () => void; onSubmit: (input: Omit<CreateCodingQuestionInput, 'authorId' | 'authorName'>) => Promise<void> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [difficulty, setDifficulty] = useState<CodingDifficulty>('MEDIUM');
  const [tags, setTags] = useState('');
  const canSubmit = title.trim().length >= 3 && problem.trim().length >= 20 && solution.trim().length >= 20 && !submitting;
  const submit = () => {
    if (!canSubmit) return;
    void onSubmit({ title: title.trim(), problemStatement: problem.trim(), solution: solution.trim(), language: language.trim() || 'JavaScript', difficulty, tags: tags.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5) });
  };
  const input = (value: string, onChangeText: (value: string) => void, placeholder: string, multiline = false, height?: number) => (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }, multiline && { height }]} />
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable style={styles.headerAction} onPress={onClose} hitSlop={8}><Text style={[styles.cancel, { color: colors.textMuted }]}>Cancel</Text></Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Share problem</Text>
          <Pressable style={styles.headerAction} disabled={!canSubmit} onPress={submit} hitSlop={8}>{submitting ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.post, { color: canSubmit ? colors.primary : colors.textMuted }]}>Post</Text>}</Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: colors.text }]}>Question title</Text>
          {input(title, setTitle, 'e.g. Longest substring without repeats')}
          <Text style={[styles.label, styles.topGap, { color: colors.text }]}>Problem statement</Text>
          {input(problem, setProblem, 'Describe the problem and constraints...', true, 140)}
          <Text style={[styles.label, styles.topGap, { color: colors.text }]}>Your solution</Text>
          {input(solution, setSolution, 'Explain the idea, complexity, and include code...', true, 200)}
          <Text style={[styles.label, styles.topGap, { color: colors.text }]}>Language</Text>
          {input(language, setLanguage, 'JavaScript, Python, Java...')}
          <Text style={[styles.label, styles.topGap, { color: colors.text }]}>Difficulty</Text>
          <View style={styles.difficultyRow}>{DIFFICULTIES.map((item) => { const meta = difficultyMeta(item); const active = difficulty === item; return <Pressable key={item} onPress={() => setDifficulty(item)} style={[styles.difficulty, { borderColor: active ? meta.color : colors.border, backgroundColor: active ? meta.bg : colors.surface }]}><Text style={{ color: active ? meta.color : colors.textMuted, fontWeight: '800' }}>{meta.label}</Text></Pressable>; })}</View>
          <Text style={[styles.label, styles.topGap, { color: colors.text }]}>Tags (comma separated)</Text>
          {input(tags, setTags, 'arrays, sliding-window')}
          <Text style={[styles.requirement, { color: colors.textMuted }]}>Add at least 20 characters for both the problem and solution.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  headerAction: { minWidth: 68, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', marginHorizontal: spacing.xs },
  cancel: { fontWeight: '700', fontSize: 15 },
  post: { fontWeight: '900', fontSize: 16 },
  body: { padding: spacing.md },
  label: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
  topGap: { marginTop: spacing.md },
  input: { minHeight: 52, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
  difficultyRow: { flexDirection: 'row', gap: 8 },
  difficulty: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, borderWidth: 1 },
  requirement: { fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
});
