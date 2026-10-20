import { Ionicons } from '@expo/vector-icons';
import { Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/hooks/useTheme';
import { borderRadius, spacing } from '@/src/theme';

type ProfileEditorProps = {
  visible: boolean;
  user: any;
  profile: any;
  roleProfile: any;
  existing: any;
  saving: boolean;
  onClose: () => void;
  onSave: (input: any) => Promise<void>;
};

export function NetworkProfileEditor({ visible, user, profile, roleProfile, existing, saving, onClose, onSave }: ProfileEditorProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');

  useEffect(() => {
    if (!visible) return;
    setBio(existing?.bio ?? '');
    setSkills(existing?.skills?.join(', ') ?? '');
    setInterests(existing?.interests?.join(', ') ?? '');
    setGithub(existing?.githubUrl ?? '');
    setLinkedin(existing?.linkedinUrl ?? '');
  }, [existing, visible]);

  const save = () => {
    const student = roleProfile?.type === 'STUDENT' ? roleProfile.data : null;
    if (!user || !profile || !student || saving) return;
    void onSave({
      userId: user.uid,
      displayName: profile.name,
      username: profile.username || 'student',
      citianId: profile.citianId,
      departmentId: student.departmentId,
      departmentName: roleProfile.departmentName,
      year: student.year,
      section: student.section,
      bio: bio.trim(),
      skills: skills.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 10),
      interests: interests.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 10),
      githubUrl: github.trim(),
      linkedinUrl: linkedin.trim(),
      visibility: 'COLLEGE_ONLY',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable style={styles.headerAction} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel profile editing">
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Your network profile</Text>
          <Pressable style={styles.headerAction} onPress={save} disabled={saving} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save network profile">
            {saving ? <Text style={[styles.saveText, { color: colors.textMuted }]}>Saving…</Text> : <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>}
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.hint, { color: colors.textMuted }]}>This profile is visible to active Citians. Your phone number, email, and register number stay private.</Text>
          <EditorInput label="Bio" value={bio} onChange={setBio} placeholder="What are you learning or building?" multiline />
          <EditorInput label="Skills" value={skills} onChange={setSkills} placeholder="React Native, Python, UI design" />
          <EditorInput label="Interests" value={interests} onChange={setInterests} placeholder="AI, hackathons, open source" />
          <EditorInput label="GitHub URL" value={github} onChange={setGithub} placeholder="https://github.com/..." />
          <EditorInput label="LinkedIn URL" value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/..." />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  function EditorInput({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }, multiline && styles.multiline]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  headerAction: { minWidth: 68, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', marginHorizontal: spacing.xs },
  cancelText: { fontSize: 15, fontWeight: '700' },
  saveText: { fontSize: 16, fontWeight: '900' },
  body: { padding: spacing.md },
  hint: { fontSize: 15, lineHeight: 21, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
  multiline: { minHeight: 120, paddingTop: spacing.md },
});
