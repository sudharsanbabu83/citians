import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/hooks/useTheme';
import { usePublishedOpeningSpotlights } from '@/src/hooks/useContent';
import type { OpeningSpotlight } from '@/src/lib/content';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

function getRoute(spotlight: OpeningSpotlight): Href | null {
  switch (spotlight.target) {
    case 'EVENT_DETAIL':
      return spotlight.targetId ? `/(student)/events/${spotlight.targetId}` as Href : '/(student)/(tabs)/events' as Href;
    case 'EVENTS':
      return '/(student)/(tabs)/events' as Href;
    case 'TECH_PULSE':
      return '/(student)/tech-pulse' as Href;
    case 'CODE_TOGETHER':
      return '/(student)/leetcode' as Href;
    case 'NETWORK':
      return '/(student)/network' as Href;
    case 'FOCUS':
      return '/(student)/focus-blocker' as Href;
    default:
      return null;
  }
}

export function OpeningSpotlightModal() {
  const { colors } = useTheme();
  const { data: spotlights = [] } = usePublishedOpeningSpotlights();
  const spotlight = spotlights[0];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    setVisible(false);
    if (!spotlight) return () => { mounted = false; };
    AsyncStorage.getItem(`citians.opening-spotlight.seen.${spotlight.id}`).then((value) => {
      if (mounted && value !== 'seen') setVisible(true);
    }).catch(() => {
      if (mounted) setVisible(true);
    });
    return () => { mounted = false; };
  }, [spotlight?.id]);

  const close = () => {
    if (!spotlight) return;
    setVisible(false);
    AsyncStorage.setItem(`citians.opening-spotlight.seen.${spotlight.id}`, 'seen').catch(() => undefined);
  };

  const openAction = () => {
    const route = spotlight ? getRoute(spotlight) : null;
    close();
    if (route) router.push(route);
  };

  if (!spotlight) return null;

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.colorBand, { backgroundColor: spotlight.accentColor || colors.primary }]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: `${spotlight.accentColor || colors.primary}20` }]}>
              <Text style={[styles.badgeText, { color: spotlight.accentColor || colors.primary }]}>{spotlight.kind === 'EVENT' ? 'CAMPUS EVENT' : spotlight.kind}</Text>
            </View>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close opening spotlight">
              <Text style={[styles.close, { color: colors.textMuted }]}>×</Text>
            </Pressable>
          </View>
          <View style={styles.emojiBubble}><Text style={styles.emoji}>{spotlight.emoji || '📣'}</Text></View>
          <Text style={[styles.title, { color: colors.text }]}>{spotlight.title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{spotlight.message}</Text>
          <Pressable style={[styles.action, { backgroundColor: spotlight.accentColor || colors.primary }]} onPress={openAction} accessibilityRole="button" accessibilityLabel={spotlight.actionLabel}>
            <Text style={styles.actionText}>{spotlight.actionLabel}</Text>
            <Text style={styles.actionArrow}>→</Text>
          </Pressable>
          <Text style={[styles.note, { color: colors.textMuted }]}>You’ll see this once. New campus spotlights appear automatically.</Text>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 15, 35, .58)', justifyContent: 'center', padding: spacing.lg },
  card: { borderRadius: 26, overflow: 'hidden', shadowColor: '#000', shadowOpacity: .25, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
  colorBand: { height: 9 },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  close: { fontSize: 28, lineHeight: 23, fontWeight: '300' },
  emojiBubble: { width: 68, height: 68, borderRadius: 23, backgroundColor: '#FFF0D8', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, transform: [{ rotate: '-5deg' }] },
  emoji: { fontSize: 36 },
  title: { fontSize: 25, lineHeight: 29, fontFamily: fontFamilies.display, marginTop: spacing.md },
  message: { fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  action: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, marginTop: spacing.lg, paddingHorizontal: spacing.md },
  actionText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  actionArrow: { color: '#FFF', fontSize: 20, lineHeight: 18 },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.md },
});
