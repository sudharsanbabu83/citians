import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

interface Props {
  visible: boolean;
  eventTitle: string;
  approvalMode: 'AUTO' | 'MANUAL';
  isWaitlist: boolean;
  initialName: string;
  initialRegisterNumber: string;
  initialPhone: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (details: { attendeeName: string; registerNumber: string; phoneNumber: string }) => void;
}

export function EventRegistrationSheet(props: Props) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(props.initialName);
  const [registerNumber, setRegisterNumber] = useState(props.initialRegisterNumber);
  const [phone, setPhone] = useState(props.initialPhone);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!props.visible) return;
    setName(props.initialName);
    setRegisterNumber(props.initialRegisterNumber);
    setPhone(props.initialPhone);
    setError('');
  }, [props.visible, props.initialName, props.initialRegisterNumber, props.initialPhone]);

  const submit = () => {
    const compactPhone = phone.trim();
    if (name.trim().length < 2) return setError('Please enter your full name.');
    if (registerNumber.trim().length < 2) return setError('Please enter your register number.');
    if (!/^\+?[0-9][0-9\s-]{7,17}$/.test(compactPhone)) return setError('Please enter a valid mobile number.');
    setError('');
    props.onSubmit({ attendeeName: name.trim(), registerNumber: registerNumber.trim(), phoneNumber: compactPhone });
  };

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <Pressable style={styles.dismissArea} onPress={props.onClose} accessibilityLabel="Close registration" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + spacing.lg, 32) }]}>
            <View style={styles.headingRow}>
              <View style={styles.iconWrap}><Ionicons name="ticket-outline" size={24} color={colors.primary} /></View>
              <View style={styles.headingCopy}>
                <Text style={styles.eyebrow}>{props.isWaitlist ? 'JOIN THE QUEUE' : 'RESERVE YOUR PLACE'}</Text>
                <Text style={styles.title}>Confirm your registration</Text>
              </View>
              <Pressable onPress={props.onClose} style={styles.closeButton} accessibilityLabel="Close registration">
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.eventTitle} numberOfLines={2}>{props.eventTitle}</Text>
            <View style={styles.promiseCard}>
              <Ionicons name={props.approvalMode === 'AUTO' ? 'flash-outline' : 'shield-checkmark-outline'} size={18} color={colors.primary} />
              <Text style={styles.promiseText}>
                {props.isWaitlist
                  ? 'You will be moved forward automatically when a seat opens.'
                  : props.approvalMode === 'AUTO'
                    ? 'Your pass will be created immediately after confirmation.'
                    : 'The host will review your request before issuing a pass.'}
              </Text>
            </View>
            <LabeledInput label="Full name" icon="person-outline" value={name} onChangeText={setName} placeholder="Your official name" autoCapitalize="words" />
            <LabeledInput label="Register number" icon="id-card-outline" value={registerNumber} onChangeText={setRegisterNumber} placeholder="College register number" autoCapitalize="characters" />
            <LabeledInput label="Mobile number" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" />
            <Text style={styles.privacy}><Ionicons name="lock-closed" size={12} /> Your details are visible only to the event host and admins.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.submit, props.isSubmitting && styles.disabled]} onPress={submit} disabled={props.isSubmitting} accessibilityRole="button">
              {props.isSubmitting ? <ActivityIndicator color={colors.white} /> : <>
                <Text style={styles.submitText}>{props.isWaitlist ? 'Join waitlist' : 'Confirm registration'}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LabeledInput({ label, icon, ...inputProps }: React.ComponentProps<typeof TextInput> & { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput {...inputProps} style={styles.input} placeholderTextColor={colors.textMuted} accessibilityLabel={label} />
    </View>
  </View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 15, 28, 0.55)' },
  dismissArea: { flex: 1 },
  sheet: { maxHeight: '92%', backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', backgroundColor: theme.colors.border, marginTop: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 32 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentBg },
  headingCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: theme.colors.primary },
  title: { ...theme.typography.heading, marginTop: 2 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: theme.colors.background },
  eventTitle: { ...theme.typography.body, fontWeight: '700' },
  promiseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: theme.colors.accentBg },
  promiseText: { flex: 1, color: theme.colors.text, fontSize: 12, lineHeight: 18 },
  field: { gap: 6 }, label: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background, borderRadius: borderRadius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, minHeight: 48, color: theme.colors.text, fontSize: 15, outlineStyle: 'none' } as never,
  privacy: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
  error: { color: theme.colors.error, fontSize: 12, fontWeight: '600' },
  submit: { minHeight: 50, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: theme.colors.primary },
  submitText: { color: theme.colors.white, fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.65 },
});
