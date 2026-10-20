import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { EventAnnouncementAudience, EventAnnouncementPriority } from '@campusflow/shared';

import { useEvent } from '@/src/hooks/useEvents';
import { useEventAnnouncements, useEventAnnouncementMutations } from '@/src/hooks/useEventAnnouncements';
import { useAuthStore } from '@/src/lib/authStore';
import { toDate } from '@/src/lib/dates';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { fontFamilies, spacing } from '@/src/theme';

const PRIORITIES: Array<{ value: EventAnnouncementPriority; label: string; color: string; icon: 'megaphone-outline' | 'alert-circle-outline' | 'warning-outline' }> = [
  { value: 'NORMAL', label: 'Update', color: '#4F46E5', icon: 'megaphone-outline' },
  { value: 'IMPORTANT', label: 'Important', color: '#C76A00', icon: 'alert-circle-outline' },
  { value: 'URGENT', label: 'Urgent', color: '#D13D50', icon: 'warning-outline' },
];
const AUDIENCES: Array<{ value: EventAnnouncementAudience; label: string }> = [
  { value: 'APPROVED', label: 'Confirmed' },
  { value: 'ALL_REGISTERED', label: 'All registered' },
  { value: 'WAITLISTED', label: 'Waitlist' },
  { value: 'CHECKED_IN', label: 'Checked in' },
];

const formatTime = (value: unknown) => toDate(value)?.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) ?? 'Sending…';

export default function EventAnnouncementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const isHost = event?.organizerUserId === user?.uid;
  const { items, isLoading, error } = useEventAnnouncements(id, user?.uid, isHost);
  const { publish, acknowledge } = useEventAnnouncementMutations();
  const bottomPadding = useBottomContentPadding();
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<EventAnnouncementPriority>('NORMAL');
  const [audience, setAudience] = useState<EventAnnouncementAudience>('APPROVED');
  const [isPinned, setIsPinned] = useState(false);
  const pinned = useMemo(() => items.filter((item) => item.isPinned), [items]);
  const regular = useMemo(() => items.filter((item) => !item.isPinned), [items]);

  const send = async () => {
    if (!id || message.trim().length < 3) return;
    try {
      const result = await publish.mutateAsync({ eventId: id, message: message.trim(), priority, audience, isPinned });
      setMessage(''); setPriority('NORMAL'); setAudience('APPROVED'); setIsPinned(false);
      Alert.alert('Broadcast sent', `${result.recipientCount} attendee${result.recipientCount === 1 ? '' : 's'} received this announcement.`);
    } catch (nextError) {
      Alert.alert('Could not publish', nextError instanceof Error ? nextError.message : 'Please try again.');
    }
  };

  if (eventLoading) return <View style={styles.center}><ActivityIndicator color="#6750A4" size="large" /></View>;
  if (!event) return <View style={styles.center}><Text style={styles.error}>Event not found.</Text></View>;

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={styles.hero}>
      <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>EVENT SIGNAL</Text></View>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.subtitle}>{isHost ? 'One message. Every attendee in sync.' : 'Official updates from your event host.'}</Text>
    </View>

    {isHost ? <View style={styles.composer}>
      <View style={styles.composerHeading}><View style={styles.composerIcon}><Ionicons name="radio-outline" size={20} color="#6750A4" /></View><View><Text style={styles.composerTitle}>New broadcast</Text><Text style={styles.composerCaption}>Push notification + live event feed</Text></View></View>
      <TextInput accessibilityLabel="Announcement message" multiline maxLength={1200} value={message} onChangeText={setMessage} placeholder="What should attendees know?" placeholderTextColor="#8D8797" style={styles.input} />
      <Text style={styles.counter}>{message.length}/1200</Text>
      <Text style={styles.fieldLabel}>PRIORITY</Text>
      <View style={styles.choices}>{PRIORITIES.map((item) => <Pressable key={item.value} onPress={() => setPriority(item.value)} style={[styles.choice, priority === item.value && { backgroundColor: item.color, borderColor: item.color }]}><Ionicons name={item.icon} size={14} color={priority === item.value ? '#FFF' : item.color} /><Text style={[styles.choiceText, priority === item.value && styles.choiceTextActive]}>{item.label}</Text></Pressable>)}</View>
      <Text style={styles.fieldLabel}>SEND TO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{AUDIENCES.map((item) => <Pressable key={item.value} onPress={() => setAudience(item.value)} style={[styles.audienceChoice, audience === item.value && styles.audienceActive]}><Text style={[styles.audienceText, audience === item.value && styles.audienceTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
      <Pressable onPress={() => setIsPinned((current) => !current)} style={styles.pinRow}><Ionicons name={isPinned ? 'checkbox' : 'square-outline'} size={21} color="#6750A4" /><View><Text style={styles.pinTitle}>Pin this update</Text><Text style={styles.pinCaption}>Keep it above newer announcements</Text></View></Pressable>
      <Pressable accessibilityRole="button" onPress={send} disabled={publish.isPending || message.trim().length < 3} style={[styles.sendButton, (publish.isPending || message.trim().length < 3) && styles.disabled]}>{publish.isPending ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="send" size={17} color="#FFF" /><Text style={styles.sendText}>Broadcast now</Text></>}</Pressable>
    </View> : null}

    <View style={styles.feedHeader}><Text style={styles.feedTitle}>Broadcast timeline</Text><Text style={styles.feedCount}>{items.length} update{items.length === 1 ? '' : 's'}</Text></View>
    {isLoading ? <ActivityIndicator color="#6750A4" style={{ marginTop: 32 }} /> : error ? <View style={styles.empty}><Ionicons name="cloud-offline-outline" size={26} color="#D13D50" /><Text style={styles.error}>Could not load this event channel.</Text></View> : items.length === 0 ? <View style={styles.empty}><Ionicons name="radio-outline" size={28} color="#938C9E" /><Text style={styles.emptyTitle}>The channel is quiet</Text><Text style={styles.emptyText}>{isHost ? 'Your first broadcast will appear here instantly.' : 'Your host has not posted an announcement yet.'}</Text></View> : <>
      {pinned.map((item) => <AnnouncementCard key={item.id} item={item} isHost={isHost} busy={acknowledge.isPending} onAcknowledge={() => acknowledge.mutate(item.id)} />)}
      {regular.map((item) => <AnnouncementCard key={item.id} item={item} isHost={isHost} busy={acknowledge.isPending} onAcknowledge={() => acknowledge.mutate(item.id)} />)}
    </>}
  </ScrollView></KeyboardAvoidingView>;
}

function AnnouncementCard({ item, isHost, busy, onAcknowledge }: { item: ReturnType<typeof useEventAnnouncements>['items'][number]; isHost: boolean; busy: boolean; onAcknowledge: () => void }) {
  const info = PRIORITIES.find((entry) => entry.value === item.priority) ?? PRIORITIES[0];
  return <View style={[styles.card, { borderLeftColor: info.color }, item.isPinned && styles.pinnedCard]}>
    <View style={styles.cardTop}><View style={[styles.priorityPill, { backgroundColor: `${info.color}18` }]}><Ionicons name={info.icon} size={13} color={info.color} /><Text style={[styles.priorityText, { color: info.color }]}>{info.label.toUpperCase()}</Text></View>{item.isPinned ? <View style={styles.pinnedPill}><Ionicons name="pin" size={11} color="#6750A4" /><Text style={styles.pinnedText}>PINNED</Text></View> : null}<Text style={styles.time}>{formatTime(item.createdAt)}</Text></View>
    <Text style={styles.message}>{item.message}</Text>
    <View style={styles.cardFooter}><Text style={styles.host}>By {item.organizerName}</Text>{isHost ? <Text style={styles.delivery}>{item.acknowledgedCount}/{item.recipientCount} acknowledged</Text> : item.acknowledged ? <View style={styles.gotIt}><Ionicons name="checkmark-circle" size={16} color="#21845A" /><Text style={styles.gotItText}>Acknowledged</Text></View> : <Pressable disabled={busy} onPress={onAcknowledge} style={styles.ackButton}><Text style={styles.ackText}>Got it</Text><Ionicons name="checkmark" size={14} color="#6750A4" /></Pressable>}</View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F4EE' }, content: { padding: spacing.md, gap: 12 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F4EE' },
  hero: { backgroundColor: '#211D31', borderRadius: 24, padding: 20, overflow: 'hidden' }, livePill: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B5E' }, liveText: { color: '#CFC5FF', fontSize: 9, fontFamily: fontFamilies.mono, letterSpacing: 1.3 }, title: { color: '#FFF', fontSize: 25, fontFamily: fontFamilies.displayStrong, marginTop: 10 }, subtitle: { color: '#C8C1D5', fontSize: 12, lineHeight: 18, marginTop: 5 },
  composer: { backgroundColor: '#FFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E8E1F0' }, composerHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, composerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE9FF' }, composerTitle: { fontSize: 16, fontWeight: '900', color: '#292530' }, composerCaption: { fontSize: 10, color: '#837C8D', marginTop: 2 }, input: { minHeight: 105, borderRadius: 16, backgroundColor: '#F8F6FA', borderWidth: 1, borderColor: '#E8E3EC', padding: 13, marginTop: 14, color: '#292530', fontSize: 14, lineHeight: 20, textAlignVertical: 'top' }, counter: { alignSelf: 'flex-end', fontSize: 9, color: '#948D9C', marginTop: 4 }, fieldLabel: { fontSize: 9, fontWeight: '900', color: '#776F81', letterSpacing: 1, marginTop: 13, marginBottom: 7 }, choices: { flexDirection: 'row', gap: 7 }, choice: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#DDD7E3' }, choiceText: { fontSize: 10, fontWeight: '800', color: '#595262' }, choiceTextActive: { color: '#FFF' }, audienceChoice: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, backgroundColor: '#F2EFF4' }, audienceActive: { backgroundColor: '#292530' }, audienceText: { color: '#696171', fontSize: 10, fontWeight: '800' }, audienceTextActive: { color: '#FFF' }, pinRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 }, pinTitle: { color: '#39333F', fontSize: 11, fontWeight: '800' }, pinCaption: { color: '#8A8390', fontSize: 9, marginTop: 1 }, sendButton: { height: 48, borderRadius: 15, backgroundColor: '#6750A4', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, sendText: { color: '#FFF', fontSize: 13, fontWeight: '900' }, disabled: { opacity: .45 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, feedTitle: { fontSize: 15, fontWeight: '900', color: '#312D35' }, feedCount: { fontSize: 10, color: '#817985' }, card: { backgroundColor: '#FFF', borderRadius: 18, padding: 15, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E9E4EC' }, pinnedCard: { backgroundColor: '#FBF9FF', borderColor: '#DCD2FA' }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 7 }, priorityPill: { flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 4 }, priorityText: { fontSize: 8, fontWeight: '900', letterSpacing: .5 }, pinnedPill: { flexDirection: 'row', alignItems: 'center', gap: 3 }, pinnedText: { color: '#6750A4', fontSize: 8, fontWeight: '900' }, time: { marginLeft: 'auto', color: '#938C99', fontSize: 9 }, message: { color: '#2D2931', fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 12 }, cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 13 }, host: { color: '#89818F', fontSize: 9, flex: 1 }, delivery: { color: '#6750A4', fontSize: 9, fontWeight: '800' }, ackButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEE9FF', borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7 }, ackText: { color: '#6750A4', fontSize: 10, fontWeight: '900' }, gotIt: { flexDirection: 'row', alignItems: 'center', gap: 4 }, gotItText: { color: '#21845A', fontSize: 9, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 38, paddingHorizontal: 24, backgroundColor: '#FFF', borderRadius: 18 }, emptyTitle: { color: '#39343D', fontSize: 15, fontWeight: '900', marginTop: 8 }, emptyText: { color: '#89818F', fontSize: 11, textAlign: 'center', marginTop: 4 }, error: { color: '#D13D50', textAlign: 'center', fontWeight: '700', marginTop: 7 },
});
