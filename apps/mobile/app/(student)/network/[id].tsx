import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import { fetchNetworkProfiles, fetchNetworkState, fetchConversation, sendNetworkMessage } from '@/src/lib/network';
import type { NetworkMessageWithId, NetworkProfileWithId } from '@campusflow/shared';
import { borderRadius, spacing } from '@/src/theme';

export default function NetworkChatScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [person, setPerson] = useState<NetworkProfileWithId | null>(null);
  const [messages, setMessages] = useState<NetworkMessageWithId[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      const [people, state] = await Promise.all([fetchNetworkProfiles(), fetchNetworkState(user.uid)]);
      if (!state.connections.some((connection) => connection.userIds.includes(id))) throw new Error('You can message students after connecting with them.');
      setPerson(people.find((item) => item.id === id) ?? null);
      setMessages(await fetchConversation(user.uid, id));
    } catch (error) { Alert.alert('Chat unavailable', error instanceof Error ? error.message : 'Please connect first.', [{ text: 'Back', onPress: () => router.back() }]); }
    finally { setLoading(false); }
  }, [id, user]);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!user || !id || !body.trim() || sending) return;
    setSending(true);
    try { await sendNetworkMessage(user.uid, id, body.trim()); setBody(''); setMessages(await fetchConversation(user.uid, id)); }
    catch (error) { Alert.alert('Could not send message', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSending(false); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}><View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}><Text style={[styles.headerTitle, { color: colors.text }]}>{person?.displayName ?? 'Connection'}</Text><Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{person ? `${person.departmentName} · @${person.username}` : ''}</Text></View><FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" renderItem={({ item }) => { const own = item.senderId === user?.uid; return <View style={[styles.bubble, { backgroundColor: own ? colors.primary : colors.surface, alignSelf: own ? 'flex-end' : 'flex-start' }]}><Text style={{ color: own ? colors.white : colors.text, lineHeight: 20 }}>{item.body}</Text></View>; }} ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Start a professional conversation.</Text>} /><View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><TextInput value={body} onChangeText={setBody} placeholder="Write a message..." placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg }]} multiline maxLength={1000} /><Pressable onPress={() => void send()} disabled={!body.trim() || sending} style={[styles.send, { backgroundColor: colors.primary, opacity: body.trim() && !sending ? 1 : 0.45 }]}><Text style={{ color: colors.white, fontWeight: '900' }}>Send</Text></Pressable></View></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth }, headerTitle: { fontSize: 18, fontWeight: '900' }, headerSubtitle: { fontSize: 12, marginTop: 3 }, list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 }, bubble: { maxWidth: '82%', borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, empty: { textAlign: 'center', marginTop: spacing.xl }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth }, input: { flex: 1, minHeight: 42, maxHeight: 110, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, send: { borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 11 } });
