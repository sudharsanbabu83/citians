import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';
import { focusBlockerNative } from '@/src/lib/focusBlockerNative';

const STORAGE_KEY = 'citians.focus-blocker.v1';
const ANDROID_PACKAGES: Record<string, string> = {
  instagram: 'com.instagram.android',
  youtube: 'com.google.android.youtube',
  snapchat: 'com.snapchat.android',
  facebook: 'com.facebook.katana',
};
const APPS = [
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram' as const, color: '#E4405F' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube' as const, color: '#FF0000' },
  { id: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat' as const, color: '#E6D900' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook' as const, color: '#1877F2' },
];
const DURATIONS = [15, 30, 60, 120];

type SavedBlock = { appIds: string[]; endsAt: number };

export default function FocusBlockerScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.md });
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState(30);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedBlock;
      if (saved.endsAt > Date.now()) {
        setSelected(saved.appIds);
        setEndsAt(saved.endsAt);
      } else AsyncStorage.removeItem(STORAGE_KEY);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const active = Boolean(endsAt && endsAt > now);
  const remaining = active ? Math.max(0, endsAt! - now) : 0;
  const remainingText = useMemo(() => {
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [remaining]);

  useEffect(() => {
    if (endsAt && endsAt <= now) {
      setEndsAt(null);
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    }
  }, [endsAt, now]);

  function toggleApp(id: string) {
    if (active) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function startBlock() {
    if (!selected.length) {
      Alert.alert('Choose apps first', 'Select at least one app to block during your focus session.');
      return;
    }
    const nativeBlocker = focusBlockerNative;
    if (nativeBlocker) {
      const enabled = await nativeBlocker.isAccessibilityEnabled();
      if (!enabled) {
        Alert.alert('Allow app blocking', 'Enable Citians Focus Blocker in Android Accessibility settings, then start the session again.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => nativeBlocker.openAccessibilitySettings() },
        ]);
        return;
      }
    }
    const nextEndsAt = Date.now() + duration * 60000;
    setEndsAt(nextEndsAt);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ appIds: selected, endsAt: nextEndsAt }));
    nativeBlocker?.setBlock(selected.map((id) => ANDROID_PACKAGES[id]).filter(Boolean), nextEndsAt);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={28} color={colors.primary} /></View>
        <Text style={styles.title}>{active ? 'Focus mode is on' : 'Block distractions'}</Text>
        <Text style={styles.subtitle}>{active ? `${remainingText} remaining` : 'Choose social apps to keep out of reach while you study.'}</Text>
      </View>

      {active ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>BLOCKING SELECTED APPS</Text>
          <Text style={styles.timer}>{remainingText}</Text>
          <Text style={styles.muted}>{selected.length} app{selected.length === 1 ? '' : 's'} selected</Text>
          <View style={styles.lockedNotice}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
            <Text style={styles.lockedText}>This session ends automatically when the timer reaches zero.</Text>
          </View>
        </View>
      ) : null}

      {active ? (
        <View style={styles.waitCard}>
          <View style={styles.waitHeader}>
            <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
            <Text style={styles.waitTitle}>Use this time well</Text>
          </View>
          <Text style={styles.waitSubtitle}>Keep learning inside Citians while your distractions stay blocked.</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/(student)/(tabs)/competitions' as Href)}>
              <Ionicons name="trophy-outline" size={18} color={colors.primary} />
              <Text style={styles.actionText}>Practice</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Apps to block</Text>
      <View style={styles.card}>
        {APPS.map((app) => {
          const checked = selected.includes(app.id);
          return <Pressable key={app.id} style={styles.appRow} onPress={() => toggleApp(app.id)} disabled={active}>
            <View style={[styles.appIcon, { backgroundColor: app.color }]}><Ionicons name={app.icon} size={21} color="#fff" /></View>
            <Text style={styles.appName}>{app.name}</Text>
            <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={checked ? colors.primary : colors.textMuted} />
          </Pressable>;
        })}
      </View>

      {!active ? <>
        <Text style={styles.sectionTitle}>Focus duration</Text>
        <View style={styles.durationRow}>{DURATIONS.map((value) => <Pressable key={value} style={[styles.duration, duration === value && styles.durationSelected]} onPress={() => setDuration(value)}><Text style={[styles.durationText, duration === value && styles.durationTextSelected]}>{value < 60 ? `${value} min` : `${value / 60} hr`}</Text></Pressable>)}</View>
        <Pressable style={styles.startButton} onPress={startBlock}><Ionicons name="lock-closed" size={18} color="#fff" /><Text style={styles.startText}>Start focus session</Text></Pressable>
      </> : null}
      <Text style={styles.note}>Blocked apps remain unavailable until the focus timer finishes. You can continue using Citians for productive study activities.</Text>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', paddingVertical: spacing.md }, heroIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text }, subtitle: { ...theme.typography.body, textAlign: 'center', marginTop: spacing.xs, maxWidth: 310 }, sectionTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text, marginTop: spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, ...theme.shadows.card }, appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md }, appIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, appName: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
  durationRow: { flexDirection: 'row', gap: spacing.sm }, duration: { flex: 1, borderRadius: borderRadius.md, paddingVertical: spacing.md, backgroundColor: theme.colors.surface, alignItems: 'center' }, durationSelected: { backgroundColor: theme.colors.primary }, durationText: { fontWeight: '700', color: theme.colors.text }, durationTextSelected: { color: '#fff' },
  startButton: { minHeight: 52, borderRadius: borderRadius.md, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm }, startText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  activeCard: { backgroundColor: theme.colors.primary, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' }, activeLabel: { color: 'rgba(255,255,255,.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, timer: { color: '#fff', fontSize: 46, fontWeight: '800', marginVertical: spacing.xs }, muted: { color: 'rgba(255,255,255,.8)' }, lockedNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,.16)' }, lockedText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center', flexShrink: 1 }, waitCard: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.md, ...theme.shadows.card }, waitHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, waitTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' }, waitSubtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs }, actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: borderRadius.md, backgroundColor: theme.colors.accentBg, paddingVertical: spacing.sm }, actionText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' }, note: { ...theme.typography.caption, textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },
});
