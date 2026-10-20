import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { DOUBT_CATEGORIES, HELP_MODES, getCategoryMeta, type DoubtCategory, type HelpMode } from '@/src/lib/doubts';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

interface ComposerValue {
  title: string;
  context: string;
  category: DoubtCategory;
  helpModes: HelpMode[];
  urgency: 'CURIOUS' | 'STUCK' | 'URGENT';
}

const NEED_META: Record<HelpMode, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  EXPLAIN: { label: 'Simple explain', icon: 'bulb-outline' },
  EXAMPLE: { label: 'Real example', icon: 'flask-outline' },
  RESOURCE: { label: 'Good resource', icon: 'library-outline' },
  LIVE_SESSION: { label: 'Live session', icon: 'videocam-outline' },
};

export function DoubtComposer({ visible, submitting, onClose, onSubmit }: {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (value: ComposerValue) => Promise<void>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<DoubtCategory>('ACADEMICS');
  const [urgency, setUrgency] = useState<ComposerValue['urgency']>('STUCK');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [helpModes, setHelpModes] = useState<HelpMode[]>(['EXPLAIN']);

  useEffect(() => {
    if (!visible) return;
    setStep(0); setTitle(''); setContext(''); setCategory('ACADEMICS'); setUrgency('STUCK'); setHelpModes(['EXPLAIN']);
  }, [visible]);

  const toggleMode = (mode: HelpMode) => setHelpModes((current) => current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]);
  const canContinue = step === 0 || (title.trim().length >= 8 && context.trim().length >= 20) || helpModes.length > 0;

  const finish = async () => {
    try {
      await onSubmit({ title, context, category, urgency, helpModes });
      onClose();
    } catch {
      // The parent displays the actionable error; keep the draft open for retry.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>DROP A DOUBT · {step + 1}/3</Text>
              <Text style={styles.heading}>{step === 0 ? 'Name the territory' : step === 1 ? 'Show us where you got stuck' : 'Choose your rescue team'}</Text>
            </View>
            <Pressable style={styles.close} onPress={onClose}><Ionicons name="close" size={20} color={colors.text} /></Pressable>
          </View>
          <View style={styles.progress}><View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} /></View>

          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {step === 0 ? (
              <>
                <Text style={styles.prompt}>What world does this doubt live in?</Text>
                <View style={styles.grid}>
                  {DOUBT_CATEGORIES.map((item) => {
                    const meta = getCategoryMeta(item); const active = category === item;
                    return <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryCard, active && { borderColor: meta.color, backgroundColor: meta.soft }]}>
                      <Text style={styles.bigEmoji}>{meta.emoji}</Text><Text style={[styles.categoryLabel, active && { color: meta.color }]}>{meta.label}</Text>
                      {active ? <Ionicons name="checkmark-circle" size={19} color={meta.color} /> : null}
                    </Pressable>;
                  })}
                </View>
                <Text style={styles.prompt}>How does it feel right now?</Text>
                <View style={styles.choiceRow}>
                  {(['CURIOUS', 'STUCK', 'URGENT'] as const).map((item) => <Pressable key={item} onPress={() => setUrgency(item)} style={[styles.choice, urgency === item && styles.choiceActive]}><Text style={[styles.choiceText, urgency === item && styles.choiceTextActive]}>{item === 'CURIOUS' ? '🤔 Curious' : item === 'STUCK' ? '🧱 Stuck' : '🆘 Urgent'}</Text></Pressable>)}
                </View>
              </>
            ) : step === 1 ? (
              <>
                <Text style={styles.fieldLabel}>Your doubt, in one line</Text>
                <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="Why does… / How can I…" placeholderTextColor={colors.textMuted} style={styles.titleInput} />
                <View style={styles.counterRow}><Text style={styles.nudge}>Make it specific enough to spark different answers.</Text><Text style={styles.counter}>{title.length}/120</Text></View>
                <Text style={styles.fieldLabel}>Draw the boundary of your confusion</Text>
                <TextInput value={context} onChangeText={setContext} maxLength={800} multiline placeholder="What do you already understand? Where exactly does it stop making sense?" placeholderTextColor={colors.textMuted} style={styles.contextInput} />
                <Text style={styles.privacy}><Ionicons name="shield-checkmark" size={14} color={colors.success} /> Your real name stays hidden behind a campus alias.</Text>
              </>
            ) : (
              <>
                <Text style={styles.prompt}>Invite more than one kind of answer.</Text>
                {HELP_MODES.filter((mode) => mode !== 'LIVE_SESSION').map((mode) => { const active = helpModes.includes(mode); const meta = NEED_META[mode]; return (
                  <Pressable key={mode} onPress={() => toggleMode(mode)} style={[styles.needCard, active && styles.needCardActive]}>
                    <View style={[styles.needIcon, active && styles.needIconActive]}><Ionicons name={meta.icon} size={21} color={active ? colors.white : colors.primary} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.needTitle}>{meta.label}</Text><Text style={styles.needText}>Open a distinct branch for this style of answer.</Text></View>
                    <Ionicons name={active ? 'checkbox' : 'square-outline'} size={23} color={active ? colors.primary : colors.textMuted} />
                  </Pressable>
                ); })}
                <View style={styles.aliasPreview}><Text style={styles.aliasEmoji}>🎭</Text><View><Text style={styles.aliasTitle}>Post quietly. Learn loudly.</Text><Text style={styles.aliasText}>Your doubt launches as an anonymous signal; every answer grows as its own branch.</Text></View></View>
              </>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            {step > 0 ? <Pressable onPress={() => setStep((value) => value - 1)} style={styles.backButton}><Text style={styles.backText}>Back</Text></Pressable> : <View />}
            <Pressable disabled={!canContinue || submitting} onPress={() => step < 2 ? setStep(step + 1) : void finish()} style={[styles.nextButton, (!canContinue || submitting) && styles.disabled]}>
              {submitting ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.nextText}>{step < 2 ? 'Continue' : 'Launch my doubt'}</Text><Ionicons name={step < 2 ? 'arrow-forward' : 'sparkles'} size={18} color={colors.white} /></>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,17,39,0.55)' },
  sheet: { maxHeight: '92%', minHeight: '74%', backgroundColor: theme.colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, alignSelf: 'center', marginTop: 9 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: theme.colors.primary, fontSize: 10, letterSpacing: 1.1, fontFamily: fontFamilies.mono },
  heading: { ...theme.typography.displaySmall, fontSize: 22, marginTop: 4, maxWidth: 290 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  progress: { height: 4, backgroundColor: theme.colors.border },
  progressFill: { height: 4, backgroundColor: theme.colors.secondary },
  body: { padding: spacing.lg, paddingBottom: spacing.xl },
  prompt: { color: theme.colors.text, fontSize: 16, fontFamily: fontFamilies.display, marginBottom: spacing.md, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  categoryCard: { width: '48%', minHeight: 82, backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: theme.colors.border, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 7 },
  bigEmoji: { fontSize: 22 }, categoryLabel: { color: theme.colors.text, fontWeight: '800', flex: 1 },
  choiceRow: { flexDirection: 'row', gap: spacing.sm }, choice: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: borderRadius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  choiceActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, choiceText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 12 }, choiceTextActive: { color: theme.colors.white },
  fieldLabel: { color: theme.colors.text, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.sm },
  titleInput: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.accentBorder, borderRadius: borderRadius.lg, padding: spacing.md, color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  contextInput: { minHeight: 145, textAlignVertical: 'top', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md, color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: spacing.md }, nudge: { color: theme.colors.textMuted, fontSize: 11, flex: 1 }, counter: { color: theme.colors.textMuted, fontSize: 11 },
  privacy: { color: theme.colors.success, fontWeight: '700', fontSize: 12, marginTop: spacing.md },
  needCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: spacing.md, marginBottom: spacing.sm },
  needCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentBg }, needIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentBg }, needIconActive: { backgroundColor: theme.colors.primary },
  needTitle: { color: theme.colors.text, fontWeight: '800' }, needText: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  aliasPreview: { flexDirection: 'row', gap: spacing.md, backgroundColor: theme.colors.warningBg, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md }, aliasEmoji: { fontSize: 25 }, aliasTitle: { color: theme.colors.text, fontFamily: fontFamilies.display }, aliasText: { color: theme.colors.textMuted, fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, maxWidth: 270, marginTop: 3 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, backText: { color: theme.colors.textMuted, fontWeight: '800' }, nextButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 13, borderRadius: borderRadius.full }, nextText: { color: theme.colors.white, fontWeight: '900' }, disabled: { opacity: 0.45 },
});
