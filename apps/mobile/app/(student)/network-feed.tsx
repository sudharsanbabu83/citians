import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NetworkPostWithId } from '@campusflow/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import { commentOnNetworkPost, createNetworkPost, deleteNetworkPost, fetchNetworkPostComments, fetchNetworkPosts, flagNetworkPost, toggleNetworkPostLike } from '@/src/lib/network';
import type { AppTheme } from '@/src/lib/themeStore';
import { fontFamilies } from '@/src/theme/fonts';
import { borderRadius, spacing } from '@/src/theme';

const POST_TYPES = ['PROJECT', 'ACHIEVEMENT', 'INTERNSHIP', 'RESOURCE', 'UPDATE'] as const;

export default function NetworkFeedScreen() {
  const { colors } = useTheme(); const styles = useThemedStyles(createStyles); const user = useAuthStore((s) => s.user); const profile = useAuthStore((s) => s.profile); const requireLogin = useLoginRequired(); const bottomPadding = useBottomContentPadding({ extra: spacing.xl });
  const [posts, setPosts] = useState<NetworkPostWithId[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [composer, setComposer] = useState(false); const [expanded, setExpanded] = useState<string | null>(null); const [comments, setComments] = useState<Record<string, Array<{ id: string; authorName: string; body: string }>>>({}); const [comment, setComment] = useState<Record<string, string>>({}); const [pending, setPending] = useState(false);
  const load = useCallback(async (refresh = false) => { if (refresh) setRefreshing(true); else setLoading(true); try { setPosts(await fetchNetworkPosts()); } catch { Alert.alert('Could not load network feed', 'Please try again.'); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const report = (postId: string) => { if (!user) return; const send = async (reason: string) => { try { await flagNetworkPost(postId, user.uid, reason); Alert.alert('Thanks', 'The post has been sent for review.'); } catch (error) { Alert.alert('Could not report post', error instanceof Error ? error.message : 'Please try again.'); } }; Alert.alert('Report post', 'What needs attention?', [{ text: 'Inappropriate', onPress: () => void send('Inappropriate') }, { text: 'Spam', onPress: () => void send('Spam') }, { text: 'Misleading', onPress: () => void send('Misleading') }, { text: 'Cancel', style: 'cancel' }]); };
  const remove = (postId: string) => Alert.alert('Delete post?', 'It will be removed from the campus feed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNetworkPost(postId); setPosts((current) => current.filter((item) => item.id !== postId)); } }]);
  const toggleComments = async (postId: string) => { if (expanded === postId) { setExpanded(null); return; } setExpanded(postId); if (!comments[postId]) { const loaded = await fetchNetworkPostComments(postId); setComments((current) => ({ ...current, [postId]: loaded })); } };
  const addComment = async (postId: string) => { if (!user || !comment[postId]?.trim()) return; setPending(true); try { await commentOnNetworkPost(postId, user.uid, profile?.username || 'CIT Student', comment[postId]); setComment((current) => ({ ...current, [postId]: '' })); const loaded = await fetchNetworkPostComments(postId); setComments((current) => ({ ...current, [postId]: loaded })); await load(true); } catch (error) { Alert.alert('Could not comment', error instanceof Error ? error.message : 'Please try again.'); } finally { setPending(false); } };
  return <View style={styles.container}><View pointerEvents="none" style={styles.backdrop}><View style={styles.backdropOrbOne} /><View style={styles.backdropOrbTwo} /><View style={styles.backdropGrid} /></View><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#A7F3D0" />} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}><View style={styles.hero}><View style={styles.heroTop}><Text style={styles.eyebrow}>FIELD NOTES / 01</Text><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE CAMPUS</Text></View></View><Text style={styles.heroTitle}>Ideas worth passing on.</Text><Text style={styles.heroText}>Projects, wins, resources, and opportunities — collected from the people around you.</Text><Pressable style={styles.heroButton} onPress={() => { if (requireLogin('share a network update')) setComposer(true); }}><Ionicons name="create-outline" size={18} color="#0C1F2A" /><Text style={styles.heroButtonText}>Create update</Text></Pressable></View>{loading ? <ActivityIndicator style={styles.loading} color="#A7F3D0" /> : posts.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>The network is quiet</Text><Text style={styles.emptyText}>Be the first to share a project, achievement, or useful resource.</Text></View> : posts.map((post) => { const own = post.authorId === user?.uid; const liked = Boolean(user && post.likedByUserIds.includes(user.uid)); return <View key={post.id} style={styles.card}><View style={styles.cardTop}><View style={styles.avatar}><Text style={styles.avatarText}>{post.authorName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.author}><Text style={styles.authorName}>{post.authorName}</Text><Text style={styles.meta}>{post.type.replace('_', ' ')} · CAMPUS DISPATCH</Text></View><Pressable onPress={() => own ? remove(post.id) : report(post.id)} accessibilityRole="button" accessibilityLabel={own ? 'Delete post' : 'Report post'}><Ionicons name={own ? 'trash-outline' : 'flag-outline'} size={18} color="#73808A" /></Pressable></View><Text style={styles.title}>{post.title}</Text><Text style={styles.body}>{post.body}</Text>{post.tags.length ? <View style={styles.tags}>{post.tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}<View style={styles.actions}><Pressable style={styles.action} onPress={async () => { if (!user) return; await toggleNetworkPostLike(post, user.uid); setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likedByUserIds: liked ? item.likedByUserIds.filter((id) => id !== user.uid) : [...item.likedByUserIds, user.uid] } : item)); }}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FF6F61' : '#73808A'} /><Text style={styles.actionText}>{post.likedByUserIds.length} likes</Text></Pressable><Pressable style={styles.action} onPress={() => void toggleComments(post.id)}><Ionicons name="chatbubble-ellipses-outline" size={18} color="#73808A" /><Text style={styles.actionText}>{post.commentCount} comments</Text></Pressable></View>{expanded === post.id ? <View style={styles.comments}>{comments[post.id]?.map((item) => <View key={item.id} style={styles.comment}><Text style={styles.commentAuthor}>{item.authorName}</Text><Text style={styles.commentBody}>{item.body}</Text></View>)}<View style={styles.commentInput}><TextInput value={comment[post.id] || ''} onChangeText={(value) => setComment((current) => ({ ...current, [post.id]: value }))} placeholder="Add a helpful comment..." placeholderTextColor="#73808A" style={styles.input} /><Pressable disabled={pending} onPress={() => void addComment(post.id)}><Ionicons name="send" size={19} color="#0C8F87" /></Pressable></View></View> : null}</View>; })}</ScrollView><PostComposer visible={composer} submitting={pending} onClose={() => setComposer(false)} onSubmit={async (input) => { if (!user) return; setPending(true); try { await createNetworkPost({ ...input, authorId: user.uid, authorName: profile?.username || 'CIT Student' }); setComposer(false); await load(true); } catch (error) { Alert.alert('Could not create post', error instanceof Error ? error.message : 'Please try again.'); } finally { setPending(false); } }} /></View>;
}

function PostComposer({ visible, submitting, onClose, onSubmit }: { visible: boolean; submitting: boolean; onClose: () => void; onSubmit: (input: any) => Promise<void> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<typeof POST_TYPES[number]>('PROJECT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const canPost = title.trim().length >= 3 && body.trim().length >= 10 && !submitting;
  const submit = () => {
    if (!canPost) return;
    void onSubmit({ type, title: title.trim(), body: body.trim(), tags: tags.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5) });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={[stylesModal.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel creating update">
            <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Create update</Text>
          <Pressable disabled={!canPost} onPress={submit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Post update">
            <Text style={{ color: canPost ? colors.primary : colors.textMuted, fontWeight: '900' }}>{submitting ? 'Posting…' : 'Post'}</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl + 78 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: colors.text, fontWeight: '900', marginBottom: 6 }}>Post type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {POST_TYPES.map((item) => <Pressable key={item} onPress={() => setType(item)} style={{ backgroundColor: type === item ? colors.primary : colors.surface, borderColor: type === item ? colors.primary : colors.border, borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 9, marginRight: 7 }}><Text style={{ color: type === item ? colors.white : colors.textMuted, fontSize: 11, fontWeight: '800' }}>{item}</Text></Pressable>)}
          </ScrollView>
          <Text style={[stylesModal.label, { color: colors.text }]}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="What are you sharing?" placeholderTextColor={colors.textMuted} style={[stylesModal.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} returnKeyType="next" />
          <Text style={[stylesModal.label, { color: colors.text }]}>Details</Text>
          <TextInput multiline value={body} onChangeText={setBody} placeholder="Tell the campus community more..." placeholderTextColor={colors.textMuted} style={[stylesModal.input, stylesModal.area, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} textAlignVertical="top" />
          <Text style={[stylesModal.label, { color: colors.text }]}>Tags</Text>
          <TextInput value={tags} onChangeText={setTags} placeholder="React Native, internship" placeholderTextColor={colors.textMuted} style={[stylesModal.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} returnKeyType="done" />
        </ScrollView>
        <View style={[stylesModal.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable disabled={!canPost} onPress={submit} accessibilityRole="button" accessibilityLabel="Post update" style={[stylesModal.postButton, { backgroundColor: canPost ? colors.primary : colors.border }]}>
            <Text style={{ color: canPost ? colors.white : colors.textMuted, fontWeight: '900' }}>{submitting ? 'Posting…' : 'Post update'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stylesModal = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 62, paddingHorizontal: spacing.md, borderBottomWidth: 1 }, label: { fontWeight: '900', marginTop: spacing.md, marginBottom: 6 }, input: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 }, area: { height: 170 }, footer: { borderTopWidth: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm }, postButton: { minHeight: 48, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' } });
const feedColors = {
  ink: '#29233D',
  deep: '#FFFFFF',
  teal: '#159A92',
  mint: '#DDF8EF',
  lime: '#FFE28A',
  cream: '#FFFFFF',
  coral: '#F25F7A',
  muted: '#6D6880',
};

const createStyles = (_theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F5' },
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  backdropOrbOne: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#CFF5E8', opacity: 0.78, top: -130, right: -100 },
  backdropOrbTwo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#FFD6E2', opacity: 0.62, bottom: 80, left: -120 },
  backdropGrid: { position: 'absolute', left: 22, right: 22, top: 90, bottom: 40, borderWidth: 1, borderColor: '#F0E4E6', opacity: 0.9, borderRadius: 26 },
  content: { padding: spacing.md },
  hero: { backgroundColor: '#FFF0C2', borderWidth: 1, borderColor: '#F6D982', borderRadius: 28, padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#D45772', fontSize: 10, letterSpacing: 1.4, fontFamily: fontFamilies.mono },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DDF8EF', borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: feedColors.coral },
  liveText: { color: '#168277', fontSize: 9, fontFamily: fontFamilies.mono, letterSpacing: 0.7 },
  heroTitle: { color: feedColors.ink, fontSize: 35, lineHeight: 39, fontFamily: 'serif', letterSpacing: -0.5, marginTop: spacing.lg },
  heroText: { color: '#706477', fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: feedColors.lime, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 11, marginTop: spacing.lg },
  heroButtonText: { color: feedColors.ink, fontFamily: fontFamilies.bold },
  loading: { marginVertical: spacing.xl },
  card: { backgroundColor: feedColors.cream, borderWidth: 1, borderColor: '#EADFE8', borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md, shadowColor: '#7F5B80', shadowOpacity: 0.13, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: '#D9D0FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#5D3FD3', fontFamily: fontFamilies.bold, fontSize: 17 },
  author: { flex: 1, marginLeft: spacing.sm },
  authorName: { color: feedColors.ink, fontFamily: fontFamilies.bold },
  meta: { color: feedColors.teal, fontSize: 10, fontFamily: fontFamilies.mono, letterSpacing: 0.3, marginTop: 3 },
  title: { color: feedColors.ink, fontSize: 21, lineHeight: 25, fontFamily: 'serif', fontWeight: '700', marginTop: spacing.md },
  body: { color: '#686277', fontFamily: fontFamilies.body, lineHeight: 21, marginTop: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  tag: { color: '#0C726B', backgroundColor: '#D7F1E8', borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontFamily: fontFamilies.semibold },
  actions: { flexDirection: 'row', gap: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EADFE8', marginTop: spacing.md, paddingTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: feedColors.muted, fontFamily: fontFamilies.body, fontSize: 12 },
  comments: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EADFE8', marginTop: spacing.md, paddingTop: spacing.md },
  comment: { backgroundColor: '#FFF1F6', borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.xs },
  commentAuthor: { color: '#D45772', fontFamily: fontFamilies.bold, fontSize: 11 },
  commentBody: { color: '#403A55', fontFamily: fontFamilies.body, fontSize: 13, marginTop: 2 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#EADFE8', borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, backgroundColor: '#FFF1F6' },
  input: { flex: 1, minHeight: 42, color: '#403A55', fontFamily: fontFamilies.body },
  empty: { alignItems: 'center', backgroundColor: '#EAF9F4', borderWidth: 1, borderColor: '#BCEBDE', borderRadius: borderRadius.lg, padding: spacing.xl },
  emptyTitle: { color: feedColors.ink, fontSize: 19, fontFamily: 'serif', fontWeight: '700', marginTop: spacing.sm },
  emptyText: { color: '#687583', fontFamily: fontFamilies.body, textAlign: 'center', lineHeight: 19, marginTop: spacing.xs },
});
