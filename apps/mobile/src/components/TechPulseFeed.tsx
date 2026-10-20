import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { usePublishedTechUpdates } from '@/src/hooks/useContent';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

type TechUpdate = {
  id: string;
  category: 'AI' | 'Build' | 'Cyber safety' | 'Future';
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  source: string;
  age: string;
  title: string;
  summary: string;
  takeaway: string;
};

// Kept separate from the UI so this can be replaced by a trusted RSS/API feed later.
const UPDATES: TechUpdate[] = [
  {
    id: 'ai-agents', category: 'AI', icon: 'sparkles-outline', accent: '#7C5CFC', source: 'Citians Tech Desk', age: 'Today',
    title: 'AI agents are moving from chat to action',
    summary: 'The next wave of AI tools can plan multi-step work, use tools, and ask for human approval at the right moment.',
    takeaway: 'Learn to review the result, not just write the prompt.',
  },
  {
    id: 'ship-small', category: 'Build', icon: 'code-slash-outline', accent: '#087F73', source: 'Builder Brief', age: 'Today',
    title: 'Small, useful projects are winning attention',
    summary: 'Student builders are turning focused ideas into working products by shipping a narrow first version and improving from feedback.',
    takeaway: 'A working 1% is more valuable than an unfinished 100%.',
  },
  {
    id: 'passkeys', category: 'Cyber safety', icon: 'shield-checkmark-outline', accent: '#2372C8', source: 'Safe Tech', age: 'Yesterday',
    title: 'Passkeys make sign-in less dependent on passwords',
    summary: 'Modern sign-in systems use your device security to confirm identity, reducing the risk of reused or leaked passwords.',
    takeaway: 'Turn on multi-factor authentication wherever you can.',
  },
  {
    id: 'green-compute', category: 'Future', icon: 'leaf-outline', accent: '#C55D4E', source: 'Future Signals', age: 'Yesterday',
    title: 'Efficient computing is becoming a design skill',
    summary: 'Developers are paying more attention to smaller models, faster interfaces, and software that uses less battery and data.',
    takeaway: 'Performance is part of the user experience.',
  },
];

const SAVED_KEY = 'citians.tech-pulse.saved.v1';
const CATEGORIES = ['All', 'AI', 'Build', 'Cyber safety', 'Future'] as const;

function UpdateCard({
  item,
  expanded,
  saved,
  onToggle,
  onSave,
  compact = false,
}: {
  item: TechUpdate;
  expanded: boolean;
  saved: boolean;
  onToggle: () => void;
  onSave: () => void;
  compact?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <Pressable style={[styles.updateCard, compact && styles.compactCard]} onPress={onToggle}>
      <View style={[styles.cardAccent, { backgroundColor: item.accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.topicIcon, { backgroundColor: `${item.accent}18` }]}>
            <Ionicons name={item.icon} size={18} color={item.accent} />
          </View>
          <Text style={[styles.category, { color: item.accent }]}>{item.category.toUpperCase()}</Text>
          <Text style={styles.age}>{item.age}</Text>
          <Pressable onPress={onSave} hitSlop={8} accessibilityRole="button" accessibilityLabel={saved ? 'Remove saved update' : 'Save update'}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? item.accent : colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.updateTitle} numberOfLines={compact && !expanded ? 2 : undefined}>{item.title}</Text>
        <Text style={styles.updateSummary} numberOfLines={compact && !expanded ? 2 : undefined}>{item.summary}</Text>
        {expanded && !compact ? (
          <View style={[styles.takeaway, { backgroundColor: `${item.accent}12` }]}>
            <Text style={[styles.takeawayLabel, { color: item.accent }]}>WHY IT MATTERS</Text>
            <Text style={styles.takeawayText}>{item.takeaway}</Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.source}>{item.source}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

export function TechPulsePreview({ onSeeAll }: { onSeeAll: () => void }) {
  const styles = useThemedStyles(createStyles);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const { data: publishedUpdates = [] } = usePublishedTechUpdates();
  const updates = useMemo<TechUpdate[]>(() => publishedUpdates.length > 0
    ? publishedUpdates.map((item) => ({ ...item, icon: item.icon as keyof typeof Ionicons.glyphMap }))
    : UPDATES, [publishedUpdates]);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY).then((value) => {
      if (value) setSavedIds(JSON.parse(value) as string[]);
    }).catch(() => undefined);
  }, []);

  const save = (id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  return (
    <View style={styles.previewSection}>
      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.pulseHeading}><Ionicons name="radio-outline" size={18} color={stylesVars.pulse} /><Text style={styles.sectionTitle}>TECH PULSE</Text><View style={styles.liveDot} /></View>
          <Text style={styles.sectionSubtitle}>A quick glimpse of what’s changing in tech</Text>
        </View>
        <Pressable onPress={onSeeAll} accessibilityRole="button"><Text style={styles.seeAll}>See all</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRail}>
        {updates.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.previewItem}>
            <UpdateCard item={item} compact expanded={expandedId === item.id} saved={savedIds.includes(item.id)} onToggle={() => setExpandedId((current) => current === item.id ? null : item.id)} onSave={() => save(item.id)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function TechPulseFeed() {
  const styles = useThemedStyles(createStyles);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [expandedId, setExpandedId] = useState<string | null>(UPDATES[0].id);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const { colors } = useTheme();
  const { data: publishedUpdates = [] } = usePublishedTechUpdates();
  const updates = useMemo<TechUpdate[]>(() => publishedUpdates.length > 0
    ? publishedUpdates.map((item) => ({ ...item, icon: item.icon as keyof typeof Ionicons.glyphMap }))
    : UPDATES, [publishedUpdates]);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY).then((value) => {
      if (value) setSavedIds(JSON.parse(value) as string[]);
    }).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => category === 'All' ? updates : updates.filter((item) => item.category === category), [category, updates]);
  const save = (id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  return (
    <ScrollView style={styles.feedContainer} contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
      <View style={styles.feedHero}>
        <View style={styles.heroOrb}><Ionicons name="radio-outline" size={28} color="#fff" /></View>
        <View style={styles.heroCopy}><Text style={styles.heroEyebrow}>DAILY KNOWLEDGE HUNT</Text><Text style={styles.heroTitle}>Tech Pulse</Text><Text style={styles.heroSubtitle}>Stay curious. Understand what’s changing before it changes your work.</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
        {CATEGORIES.map((item) => <Pressable key={item} style={[styles.categoryChip, category === item && styles.categoryChipActive]} onPress={() => setCategory(item)}><Text style={[styles.categoryChipText, category === item && { color: colors.primary }]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.feedMeta}><Text style={styles.feedMetaText}>{updates.length} quick reads · 2 min total</Text><Text style={styles.feedMetaText}><Ionicons name="sparkles-outline" size={13} color={colors.textMuted} /> Curated for students</Text></View>
      {filtered.map((item) => <UpdateCard key={item.id} item={item} expanded={expandedId === item.id} saved={savedIds.includes(item.id)} onToggle={() => setExpandedId((current) => current === item.id ? null : item.id)} onSave={() => save(item.id)} />)}
      <View style={styles.sourceNote}><Ionicons name="information-circle-outline" size={16} color={colors.textMuted} /><Text style={styles.sourceNoteText}>This is a curated preview feed. Connect a trusted RSS or news API before presenting live headlines.</Text></View>
    </ScrollView>
  );
}

const stylesVars = { pulse: '#E87861' };

const createStyles = (theme: AppTheme) => StyleSheet.create({
  previewSection: { marginBottom: spacing.lg }, sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: spacing.xs }, pulseHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 }, sectionTitle: { color: theme.colors.text, fontFamily: fontFamilies.mono, fontSize: 12, fontWeight: '800', letterSpacing: 1.1 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E87861' }, sectionSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 }, seeAll: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' }, previewRail: { gap: spacing.sm, paddingRight: spacing.md }, previewItem: { width: 290 }, updateCard: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, marginBottom: spacing.sm, ...theme.shadows.card }, compactCard: { minHeight: 178, marginBottom: 0 }, cardAccent: { width: 5 }, cardBody: { flex: 1, padding: spacing.md }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 7 }, topicIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, category: { fontSize: 10, fontWeight: '900', letterSpacing: .7 }, age: { flex: 1, color: theme.colors.textMuted, fontSize: 10 }, updateTitle: { color: theme.colors.text, fontFamily: fontFamilies.display, fontSize: 18, lineHeight: 22, marginTop: spacing.sm }, updateSummary: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs }, takeaway: { borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.md }, takeawayLabel: { fontSize: 10, fontWeight: '900', letterSpacing: .8 }, takeawayText: { color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 }, cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }, source: { flex: 1, color: theme.colors.textMuted, fontSize: 10, fontWeight: '700' }, feedContainer: { flex: 1, backgroundColor: theme.colors.background }, feedContent: { padding: spacing.md, paddingBottom: spacing.xl }, feedHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#253B59', borderRadius: 24, padding: spacing.lg, marginBottom: spacing.md }, heroOrb: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#E87861', alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1 }, heroEyebrow: { color: '#F7C9B8', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, heroTitle: { color: '#fff', fontFamily: fontFamilies.display, fontSize: 28, marginTop: 2 }, heroSubtitle: { color: '#D9E5F2', fontSize: 12, lineHeight: 17, marginTop: 3 }, categoryRail: { gap: spacing.sm, paddingBottom: spacing.md }, categoryChip: { borderRadius: borderRadius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, categoryChipActive: { backgroundColor: theme.colors.accentBg, borderColor: theme.colors.primary }, categoryChipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800' }, feedMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }, feedMetaText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' }, sourceNote: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md, backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, marginTop: spacing.sm }, sourceNoteText: { flex: 1, color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
});
