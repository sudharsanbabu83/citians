import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DoubtCard } from '@/src/components/DoubtCard';
import { DoubtComposer } from '@/src/components/DoubtComposer';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useDoubtMutations, useDoubts } from '@/src/hooks/useDoubts';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/lib/authStore';
import { DEMO_DOUBTS, type DoubtFilter } from '@/src/lib/doubts';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

const FILTERS: Array<{ key: DoubtFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'PULSE', label: 'Campus pulse', icon: 'pulse-outline' },
  { key: 'UNANSWERED', label: 'No branches yet', icon: 'sparkles-outline' },
  { key: 'MY_DEPT', label: 'My department', icon: 'school-outline' },
];

export default function DoubtExchangeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: 92, includeTabBar: true });
  const responsive = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const roleProfile = useAuthStore((state) => state.roleProfile);
  const requireLogin = useLoginRequired();
  const departmentId = roleProfile?.type === 'STUDENT' ? roleProfile.data.departmentId : undefined;
  const [filter, setFilter] = useState<DoubtFilter>('PULSE');
  const [composerOpen, setComposerOpen] = useState(false);
  const pulse = useRef(new Animated.Value(0.6)).current;
  const { data = [], isLoading, isError, refetch, isRefetching } = useDoubts(filter, departmentId);
  const { create } = useDoubtMutations();

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const usingPreviewData = __DEV__ && (isError || (!isLoading && data.length === 0));
  const doubts = usingPreviewData ? DEMO_DOUBTS.filter((item) => {
    if (filter === 'UNANSWERED') return item.branchCount === 0;
    if (filter === 'MY_DEPT' && departmentId) return item.departmentId === departmentId;
    return true;
  }) : data;

  const stats = useMemo(() => ({
    open: doubts.length,
    branches: doubts.reduce((sum, item) => sum + item.branchCount, 0),
  }), [doubts]);

  const openComposer = () => {
    if (__DEV__ && !user) {
      setComposerOpen(true);
      return;
    }
    if (!requireLogin('drop an anonymous doubt')) return;
    setComposerOpen(true);
  };

  const submit = async (input: Parameters<typeof create.mutateAsync>[0]['input']) => {
    if (!user || roleProfile?.type !== 'STUDENT') {
      Alert.alert('Preview complete', 'Sign in as a student to launch this signal to the campus.');
      return;
    }
    try {
      await create.mutateAsync({
        author: { userId: user.uid, departmentId: roleProfile.data.departmentId, departmentName: roleProfile.departmentName, year: roleProfile.data.year },
        input,
      });
    } catch (error) {
      Alert.alert('Could not launch your doubt', error instanceof Error ? error.message : 'Please try again.');
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, responsive.readableContentStyle, { paddingBottom: bottomPadding, paddingHorizontal: responsive.gutter }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.hero}>
          <View style={styles.orbOne} /><View style={styles.orbTwo} />
          <View style={styles.liveRow}>
            <Animated.View style={[styles.pulseDot, { opacity: pulse, transform: [{ scale: pulse }] }]} />
            <Text style={styles.liveLabel}>CAMPUS MINDS, LIVE</Text>
          </View>
          <Text style={styles.heroTitle}>Doubt Exchange</Text>
          <Text style={styles.heroText}>Drop a signal anonymously. Watch different answers grow into branches, with simple explanations and useful perspectives side by side.</Text>
          <Pressable style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]} onPress={openComposer}>
            <View style={styles.heroButtonIcon}><Ionicons name="radio-outline" size={20} color="#6C4CF6" /></View>
            <Text style={styles.heroButtonText}>Drop a doubt signal</Text>
            <Ionicons name="arrow-forward" size={18} color="#6C4CF6" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={[styles.statNumber, { color: '#6C4CF6' }]}>{stats.open}</Text><Text style={styles.statLabel}>signals</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={[styles.statNumber, { color: '#079A83' }]}>{stats.branches}</Text><Text style={styles.statLabel}>answer branches</Text></View>
        </View>

        <View style={styles.howRow}>
          <View style={styles.howIcon}><Ionicons name="git-branch" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.howTitle}>Answers do not compete — they branch.</Text><Text style={styles.howText}>A simple explanation, worked example and senior perspective can all stay visible side by side.</Text></View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, active && styles.filterActive]}>
              <Ionicons name={item.icon} size={15} color={active ? colors.white : colors.textMuted} />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>;
          })}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionEyebrow}>{filter === 'PULSE' ? 'TRENDING NOW' : 'EXPLORE'}</Text><Text style={styles.sectionTitle}>{FILTERS.find((item) => item.key === filter)?.label}</Text></View>
          {usingPreviewData ? <View style={styles.previewBadge}><Text style={styles.previewText}>Interactive preview</Text></View> : null}
        </View>

        {isLoading && !usingPreviewData ? <ActivityIndicator style={styles.loading} size="large" color={colors.primary} /> : doubts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text><Text style={styles.emptyTitle}>A quiet corner — for now</Text>
            <Text style={styles.emptyText}>Launch the first doubt here. You may be asking what ten others are afraid to say.</Text>
            <Pressable onPress={openComposer} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Start the first branch</Text></Pressable>
          </View>
        ) : doubts.map((doubt) => (
          <DoubtCard key={doubt.id} doubt={doubt} onPress={() => router.push({ pathname: '/(student)/doubts/[id]', params: { id: doubt.id } } as Href)} />
        ))}
      </ScrollView>

      <Pressable onPress={openComposer} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Ionicons name="add" size={24} color={colors.white} /><Text style={styles.fabText}>Ask quietly</Text>
      </Pressable>
      <DoubtComposer visible={composerOpen} submitting={create.isPending} onClose={() => setComposerOpen(false)} onSubmit={submit} />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md },
  hero: { backgroundColor: theme.isDark ? '#32255F' : '#6548E8', borderRadius: 26, padding: spacing.lg, overflow: 'hidden', minHeight: 252 },
  orbOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,77,141,0.28)', right: -60, top: -70 },
  orbTwo: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(77,224,188,0.20)', left: -55, bottom: -55 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, pulseDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#59F0CA' }, liveLabel: { color: '#CCFFF2', fontSize: 10, letterSpacing: 1.2, fontFamily: fontFamilies.mono },
  heroTitle: { color: '#FFFFFF', fontSize: 35, lineHeight: 39, fontFamily: fontFamilies.displayStrong, letterSpacing: -0.8, marginTop: spacing.sm }, heroText: { color: '#EEE9FF', fontSize: 14, lineHeight: 20, fontFamily: fontFamilies.body, maxWidth: 420, marginTop: 6 },
  heroButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FFFFFF', borderRadius: borderRadius.full, padding: 8, paddingRight: spacing.md, marginTop: spacing.lg, alignSelf: 'flex-start' }, heroButtonIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' }, heroButtonText: { color: '#392580', fontWeight: '900', flexShrink: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing.md, paddingVertical: spacing.md }, stat: { flex: 1, alignItems: 'center' }, statNumber: { fontSize: 20, fontFamily: fontFamilies.mono }, statLabel: { color: theme.colors.textMuted, fontSize: 10, fontFamily: fontFamilies.semibold, textAlign: 'center', marginTop: 2 }, statDivider: { width: 1, height: 31, backgroundColor: theme.colors.border },
  howRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm }, howIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: theme.colors.accentBg, alignItems: 'center', justifyContent: 'center' }, howTitle: { color: theme.colors.text, fontFamily: fontFamilies.display, fontSize: 15 }, howText: { color: theme.colors.textMuted, fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  filters: { gap: spacing.sm, paddingBottom: spacing.md }, filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: borderRadius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, filterText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800' }, filterTextActive: { color: theme.colors.white },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md }, sectionEyebrow: { color: theme.colors.secondary, fontSize: 10, letterSpacing: 1.2, fontFamily: fontFamilies.mono }, sectionTitle: { ...theme.typography.displaySmall, marginTop: 2 }, previewBadge: { backgroundColor: theme.colors.warningBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: borderRadius.full }, previewText: { color: theme.colors.warning, fontSize: 10, fontFamily: fontFamilies.bold },
  loading: { marginVertical: spacing.xl }, empty: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, alignItems: 'center', padding: spacing.xl }, emptyEmoji: { fontSize: 32 }, emptyTitle: { ...theme.typography.heading, marginTop: spacing.sm }, emptyText: { ...theme.typography.caption, textAlign: 'center', lineHeight: 18, marginTop: spacing.xs }, emptyButton: { marginTop: spacing.md, backgroundColor: theme.colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full }, emptyButtonText: { color: theme.colors.white, fontWeight: '900' },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.secondary, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: 14, ...theme.shadows.card }, fabText: { color: theme.colors.white, fontWeight: '900' }, pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
