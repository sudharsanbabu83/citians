import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ConnectionRequestWithId, NetworkProfileWithId } from '@campusflow/shared';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { NetworkProfileEditor } from '@/src/components/NetworkProfileEditor';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import {
  blockUser,
  cancelConnectionRequest,
  fetchNetworkProfiles,
  fetchOwnNetworkProfile,
  fetchNetworkState,
  getConnectionState,
  reportProfile,
  respondToConnectionRequest,
  saveNetworkProfile,
  sendConnectionRequest,
  type ConnectionState,
} from '@/src/lib/network';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

type Tab = 'DISCOVER' | 'REQUESTS' | 'CONNECTIONS';

export default function StudentNetworkScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const requireLogin = useLoginRequired();
  const bottomPadding = useBottomContentPadding({ extra: spacing.xl });
  const [tab, setTab] = useState<Tab>('DISCOVER');
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<NetworkProfileWithId[]>([]);
  const [requests, setRequests] = useState<ConnectionRequestWithId[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [ownNetworkProfile, setOwnNetworkProfile] = useState<NetworkProfileWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!user) { setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      let own = await fetchOwnNetworkProfile(user.uid);
      if (!own && roleProfile?.type === 'STUDENT' && profile?.username) {
        await saveNetworkProfile({
          userId: user.uid,
          displayName: profile.name,
          username: profile.username,
          citianId: profile.citianId,
          departmentId: roleProfile.data.departmentId,
          departmentName: roleProfile.departmentName,
          year: roleProfile.data.year,
          section: roleProfile.data.section,
          bio: '',
          skills: [],
          interests: [],
          githubUrl: '',
          linkedinUrl: '',
          visibility: 'COLLEGE_ONLY',
        });
        own = await fetchOwnNetworkProfile(user.uid);
      }
      setOwnNetworkProfile(own);
      const [people, state] = await Promise.all([fetchNetworkProfiles(), fetchNetworkState(user.uid)]);
      setProfiles(people.filter((item) => item.id !== user.uid));
      setRequests(state.requests);
      setConnectedIds(state.connections.flatMap((item) => item.userIds.filter((id) => id !== user.uid)));
      setBlockedIds(state.blockedIds);
    } catch { Alert.alert('Could not load student network', 'Please try again.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile, roleProfile, user]);

  useEffect(() => { void load(); }, [load]);

  const pendingReceived = requests.filter((item) => item.recipientId === user?.uid && item.status === 'PENDING');
  const pendingSent = requests.filter((item) => item.requesterId === user?.uid && item.status === 'PENDING');
  const sentRequests = requests.filter((item) => item.requesterId === user?.uid && item.status !== 'CANCELLED');
  const visibleProfiles = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return profiles.filter((item) => !blockedIds.includes(item.id) && (!normalized || [item.displayName, item.username, item.citianId, item.departmentName, item.year, item.section, ...item.skills, ...item.interests].some((value) => value?.toLowerCase().includes(normalized))));
  }, [profiles, search, blockedIds]);
  const connectionProfiles = profiles.filter((item) => connectedIds.includes(item.id));

  const handleRequest = async (target: NetworkProfileWithId, state: ConnectionState) => {
    if (!user || !requireLogin('manage connections')) return;
    try {
      if (state === 'NONE') await sendConnectionRequest(user.uid, target.id);
      else if (state === 'REQUEST_SENT') {
        const request = requests.find((item) => item.requesterId === user.uid && item.recipientId === target.id && item.status === 'PENDING');
        if (request) await cancelConnectionRequest(request);
      }
      await load(true);
    } catch (error) { Alert.alert('Could not update connection', error instanceof Error ? error.message : 'Please try again.'); }
  };

  const handleResponse = async (request: ConnectionRequestWithId, accept: boolean) => {
    try { await respondToConnectionRequest(request, accept); await load(true); }
    catch { Alert.alert('Could not update request', 'Please try again.'); }
  };

  const handleBlock = (target: NetworkProfileWithId) => Alert.alert(`Block ${target.displayName}?`, 'They will disappear from your directory and connections.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: async () => { if (!user) return; await blockUser(user.uid, target.id); await load(true); } },
  ]);

  const handleReport = (target: NetworkProfileWithId) => Alert.alert('Report profile', 'Choose a reason.', [
    { text: 'Inappropriate profile', onPress: () => user && void reportProfile(user.uid, target.id, 'Inappropriate profile') },
    { text: 'Impersonation', onPress: () => user && void reportProfile(user.uid, target.id, 'Impersonation') },
    { text: 'Spam', onPress: () => user && void reportProfile(user.uid, target.id, 'Spam') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return <View style={styles.container}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="people" size={25} color={colors.primary} /></View><Text style={styles.eyebrow}>CAMPUS NETWORK</Text><Text style={styles.heroTitle}>Find your people.</Text><Text style={styles.heroText}>Discover students who share your interests, build together, and grow your professional circle.</Text></View>
      {ownNetworkProfile ? <OwnProfileCard profile={ownNetworkProfile} connectionsCount={connectedIds.length} sentRequestsCount={sentRequests.length} onEdit={() => setEditing(true)} /> : <Pressable style={styles.profileSetupCard} onPress={() => setEditing(true)}><Ionicons name="person-add-outline" size={20} color={colors.primary} /><View style={styles.profileSetupCopy}><Text style={styles.profileSetupTitle}>Create your campus profile</Text><Text style={styles.profileSetupText}>Add a short bio, skills, and interests so classmates can find you.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>}
      <View style={styles.tabs}>{(['DISCOVER', 'REQUESTS', 'CONNECTIONS'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'DISCOVER' ? 'Find students' : item === 'REQUESTS' ? `Requests${pendingReceived.length + pendingSent.length ? ` (${pendingReceived.length + pendingSent.length})` : ''}` : 'Connections'}</Text></Pressable>)}</View>
      {tab === 'DISCOVER' ? <><View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search name, skill, department..." placeholderTextColor={colors.textMuted} style={styles.searchInput} /></View>{loading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : visibleProfiles.length === 0 ? <Empty text="No students match that search yet." /> : visibleProfiles.map((person) => <ProfileCard key={person.id} person={person} state={user ? getConnectionState(user.uid, person.id, { requests, connections: connectedIds.map((id) => ({ id, userIds: [user.uid, id] } as never)), blockedIds }) : 'NONE'} onRequest={(state) => void handleRequest(person, state)} onMessage={() => router.push(`/(student)/network/${person.id}` as Href)} onBlock={() => handleBlock(person)} onReport={() => handleReport(person)} />)}</> : tab === 'REQUESTS' ? <Requests requests={requests} currentUserId={user?.uid} profiles={profiles} onRespond={(request, accept) => void handleResponse(request, accept)} onCancel={(request) => { const person = profiles.find((item) => item.id === request.recipientId); if (person) void handleRequest(person, 'REQUEST_SENT'); }} /> : connectionProfiles.length === 0 ? <Empty text="Your accepted connections will appear here." /> : connectionProfiles.map((person) => <ProfileCard key={person.id} person={person} state="CONNECTED" onRequest={() => undefined} onMessage={() => router.push(`/(student)/network/${person.id}` as Href)} onBlock={() => handleBlock(person)} onReport={() => handleReport(person)} />)}
    </ScrollView>
    <NetworkProfileEditor visible={editing} user={user} profile={profile} roleProfile={roleProfile} existing={ownNetworkProfile} saving={saving} onClose={() => setEditing(false)} onSave={async (input) => { setSaving(true); try { await saveNetworkProfile(input); setEditing(false); await load(true); } catch (error) { Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.'); } finally { setSaving(false); } }} />
  </View>;
}

function OwnProfileCard({ profile, connectionsCount, sentRequestsCount, onEdit }: { profile: NetworkProfileWithId; connectionsCount: number; sentRequestsCount: number; onEdit: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.personCard}><View style={styles.personTop}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.personCopy}><Text style={styles.profileEyebrow}>YOUR CAMPUS PROFILE</Text><Text style={styles.personName}>{profile.displayName}</Text><Text style={styles.handle}>@{profile.username} · {profile.citianId ?? 'CIT student'}</Text></View><Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit your network profile"><Ionicons name="create-outline" size={20} color={colors.primary} /></Pressable></View><View style={styles.profileInfo}><Text style={styles.profileInfoTitle}>Your information</Text><Text style={styles.personMeta}>{profile.departmentName} · Year {profile.year} · Section {profile.section}</Text>{profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : <Text style={styles.profileEmptyText}>Add a bio to help classmates know what you are building.</Text>}</View>{profile.skills.length ? <View style={styles.tags}>{profile.skills.slice(0, 5).map((skill) => <Text key={skill} style={styles.tag}>{skill}</Text>)}</View> : null}<View style={styles.profileStats}><View style={styles.profileStat}><Text style={styles.profileStatValue}>{connectionsCount}</Text><Text style={styles.profileStatLabel}>Connections</Text></View><View style={styles.profileStatDivider} /><View style={styles.profileStat}><Text style={styles.profileStatValue}>{sentRequestsCount}</Text><Text style={styles.profileStatLabel}>Sent requests</Text></View><View style={styles.profileStatDivider} /><View style={styles.profileStat}><Text style={styles.profileStatValue}>{profile.interests.length}</Text><Text style={styles.profileStatLabel}>Interests</Text></View></View><Pressable style={styles.editProfileAction} onPress={onEdit}><Ionicons name="create-outline" size={15} color={colors.primary} /><Text style={styles.editProfileActionText}>Edit profile</Text></Pressable></View>;
}

function ProfileCard({ person, state, onRequest, onMessage, onBlock, onReport }: { person: NetworkProfileWithId; state: ConnectionState; onRequest: (state: ConnectionState) => void; onMessage: () => void; onBlock: () => void; onReport: () => void }) {
  const { colors } = useTheme(); const styles = useThemedStyles(createStyles);
  return <View style={styles.personCard}><View style={styles.personTop}><View style={styles.avatar}><Text style={styles.avatarText}>{person.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.personCopy}><Text style={styles.personName}>{person.displayName}</Text><Text style={styles.handle}>@{person.username} · {person.citianId ?? 'CIT student'}</Text><Text style={styles.personMeta}>{person.departmentName} · Year {person.year} · Section {person.section}</Text></View><Pressable onPress={onReport} hitSlop={8}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} /></Pressable></View>{person.bio ? <Text style={styles.bio}>{person.bio}</Text> : null}{person.skills.length ? <View style={styles.tags}>{person.skills.slice(0, 5).map((skill) => <Text key={skill} style={styles.tag}>{skill}</Text>)}</View> : null}<View style={styles.personActions}>{state === 'CONNECTED' ? <><Pressable style={styles.primaryAction} onPress={onMessage}><Ionicons name="chatbubble-outline" size={16} color={colors.white} /><Text style={styles.primaryActionText}>Message</Text></Pressable><Text style={styles.connected}><Ionicons name="checkmark-circle" size={16} color={colors.success} /> Connected</Text></> : <Pressable style={[styles.primaryAction, state === 'REQUEST_SENT' && styles.secondaryAction]} onPress={() => onRequest(state)}><Text style={[styles.primaryActionText, state === 'REQUEST_SENT' && { color: colors.primary }]}>{state === 'REQUEST_SENT' ? 'Cancel request' : state === 'REQUEST_RECEIVED' ? 'Respond in Requests' : 'Connect'}</Text></Pressable>}<Pressable onPress={onBlock} style={styles.moreAction}><Ionicons name="ban-outline" size={17} color={colors.textMuted} /></Pressable></View></View>;
}

function Requests({ requests, currentUserId, profiles, onRespond, onCancel }: { requests: ConnectionRequestWithId[]; currentUserId?: string; profiles: NetworkProfileWithId[]; onRespond: (request: ConnectionRequestWithId, accept: boolean) => void; onCancel: (request: ConnectionRequestWithId) => void }) {
  const styles = useThemedStyles(createStyles);
  const incoming = requests.filter((request) => request.recipientId === currentUserId && request.status === 'PENDING');
  const sent = requests.filter((request) => request.requesterId === currentUserId && request.status !== 'CANCELLED');
  if (!incoming.length && !sent.length) return <Empty text="No connection requests yet." />;
  const renderCard = (request: ConnectionRequestWithId, direction: 'INCOMING' | 'SENT') => {
    const personId = direction === 'INCOMING' ? request.requesterId : request.recipientId;
    const person = profiles.find((item) => item.id === personId);
    if (!person) return null;
    return <View key={request.id} style={styles.requestCard}><View style={styles.requestHeader}><View style={styles.requestAvatar}><Text style={styles.requestAvatarText}>{person.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.personCopy}><Text style={styles.personName}>{direction === 'INCOMING' ? person.displayName : `To ${person.displayName}`}</Text><Text style={styles.personMeta}>{person.departmentName} · @{person.username}</Text></View><Text style={styles.requestStatus}>{request.status === 'PENDING' ? 'Pending' : request.status.toLowerCase()}</Text></View>{direction === 'INCOMING' ? <View style={styles.requestActions}><Pressable style={styles.primaryAction} onPress={() => onRespond(request, true)}><Text style={styles.primaryActionText}>Accept</Text></Pressable><Pressable style={styles.secondaryAction} onPress={() => onRespond(request, false)}><Text style={styles.secondaryActionText}>Decline</Text></Pressable></View> : request.status === 'PENDING' ? <View style={styles.requestActions}><Pressable style={styles.secondaryAction} onPress={() => onCancel(request)}><Text style={styles.secondaryActionText}>Cancel request</Text></Pressable></View> : null}</View>;
  };
  return <View>{incoming.length ? <Text style={styles.requestSectionTitle}>Requests received</Text> : null}{incoming.map((request) => renderCard(request, 'INCOMING'))}{sent.length ? <Text style={styles.requestSectionTitle}>Requests sent</Text> : null}{sent.map((request) => renderCard(request, 'SENT'))}</View>;
}
function Empty({ text }: { text: string }) { const styles = useThemedStyles(createStyles); return <View style={styles.empty}><Ionicons name="people-outline" size={34} color="#8B8497" /><Text style={styles.emptyText}>{text}</Text></View>; }

function ProfileEditor({ visible, user, profile, roleProfile, existing, saving, onClose, onSave }: { visible: boolean; user: any; profile: any; roleProfile: any; existing: NetworkProfileWithId | null; saving: boolean; onClose: () => void; onSave: (input: any) => Promise<void> }) { const { colors } = useTheme(); const [bio, setBio] = useState(''); const [skills, setSkills] = useState(''); const [interests, setInterests] = useState(''); const [github, setGithub] = useState(''); const [linkedin, setLinkedin] = useState(''); useEffect(() => { if (visible) { setBio(existing?.bio ?? ''); setSkills(existing?.skills?.join(', ') ?? ''); setInterests(existing?.interests?.join(', ') ?? ''); setGithub(existing?.githubUrl ?? ''); setLinkedin(existing?.linkedinUrl ?? ''); } }, [existing, visible]); const student = roleProfile?.type === 'STUDENT' ? roleProfile.data : null; const save = () => { if (!user || !profile || !student) return; void onSave({ userId: user.uid, displayName: profile.name, username: profile.username || 'student', citianId: profile.citianId, departmentId: student.departmentId, departmentName: roleProfile.departmentName, year: student.year, section: student.section, bio: bio.trim(), skills: skills.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 10), interests: interests.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 10), githubUrl: github.trim(), linkedinUrl: linkedin.trim(), visibility: 'COLLEGE_ONLY' }); }; return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={stylesModal.header}><Pressable onPress={onClose}><Text style={{ color: colors.textMuted }}>Cancel</Text></Pressable><Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Your network profile</Text><Pressable onPress={save} disabled={saving}><Text style={{ color: saving ? colors.textMuted : colors.primary, fontWeight: '900' }}>{saving ? 'Saving…' : 'Save'}</Text></Pressable></View><ScrollView contentContainerStyle={{ padding: spacing.md }}><Text style={stylesModal.hint}>This profile is visible to active Citians. Your phone number, email, and register number stay private.</Text><EditorInput label="Bio" value={bio} onChange={setBio} placeholder="What are you learning or building?" multiline /><EditorInput label="Skills" value={skills} onChange={setSkills} placeholder="React Native, Python, UI design" /><EditorInput label="Interests" value={interests} onChange={setInterests} placeholder="AI, hackathons, open source" /><EditorInput label="GitHub URL" value={github} onChange={setGithub} placeholder="https://github.com/..." /><EditorInput label="LinkedIn URL" value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/..." /></ScrollView></KeyboardAvoidingView></Modal>; }
function EditorInput({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) { const { colors } = useTheme(); return <View style={{ marginBottom: spacing.md }}><Text style={{ color: colors.text, fontWeight: '900', marginBottom: 6 }}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[stylesModal.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }, multiline && { height: 105 }]} /></View>; }

const stylesModal = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1 }, hint: { color: '#77718A', lineHeight: 19, marginBottom: spacing.lg }, input: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 } });
const networkExtraStyles = { profileSetupCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.md }, profileSetupCopy: { flex: 1 }, profileSetupTitle: { fontSize: 14, fontWeight: '900' }, profileSetupText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, profileEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1 }, profileInfo: { borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md }, profileInfoTitle: { fontSize: 12, fontWeight: '900' }, profileEmptyText: { fontSize: 12, lineHeight: 18, marginTop: 6 }, profileStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: spacing.md, paddingVertical: spacing.sm }, profileStat: { alignItems: 'center', flex: 1 }, profileStatValue: { fontSize: 17, fontWeight: '900' }, profileStatLabel: { fontSize: 10, marginTop: 3 }, profileStatDivider: { width: 1, height: 30 }, editProfileAction: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, marginTop: spacing.sm }, editProfileActionText: { fontSize: 12, fontWeight: '900' }, requestSectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: spacing.sm, marginTop: spacing.sm }, requestHeader: { flexDirection: 'row', alignItems: 'center' }, requestAvatar: { width: 36, height: 36, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' }, requestAvatarText: { fontSize: 16, fontWeight: '900' }, requestStatus: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' } } as const;
const createStyles = (theme: AppTheme) => StyleSheet.create({ ...networkExtraStyles, container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: spacing.md }, hero: { backgroundColor: theme.isDark ? '#30235B' : '#6144D9', borderRadius: 25, padding: spacing.lg }, heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }, eyebrow: { color: '#D5FFF4', fontSize: 10, letterSpacing: 1.2, fontFamily: fontFamilies.mono }, heroTitle: { color: '#fff', fontSize: 34, fontFamily: fontFamilies.displayStrong, marginTop: 5 }, heroText: { color: '#F0EBFF', lineHeight: 20, marginTop: 5 }, editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 10, marginTop: spacing.lg }, editButtonText: { color: theme.colors.primary, fontWeight: '900' }, tabs: { flexDirection: 'row', gap: 6, marginVertical: spacing.md }, tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: borderRadius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, tabText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '900' }, tabTextActive: { color: theme.colors.white }, search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }, searchInput: { flex: 1, color: theme.colors.text, paddingVertical: 12 }, loading: { marginVertical: spacing.xl }, personCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }, personTop: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 46, height: 46, borderRadius: borderRadius.full, backgroundColor: theme.colors.accentBg, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: theme.colors.primary, fontSize: 20, fontWeight: '900' }, personCopy: { flex: 1, marginLeft: spacing.sm }, personName: { color: theme.colors.text, fontSize: 16, fontWeight: '900' }, handle: { color: theme.colors.primary, fontSize: 11, marginTop: 2 }, personMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 }, bio: { color: theme.colors.textMuted, lineHeight: 19, marginTop: spacing.md }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }, tag: { color: theme.colors.link, backgroundColor: theme.colors.accentBg, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700' }, personActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }, primaryAction: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 9 }, primaryActionText: { color: theme.colors.white, fontWeight: '900', fontSize: 12 }, secondaryAction: { backgroundColor: theme.colors.accentBg, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 9 }, secondaryActionText: { color: theme.colors.primary, fontWeight: '900', fontSize: 12 }, connected: { color: theme.colors.success, fontWeight: '800', fontSize: 12 }, moreAction: { marginLeft: 'auto' }, requestCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }, requestActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, empty: { alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.xl }, emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: spacing.sm } });
