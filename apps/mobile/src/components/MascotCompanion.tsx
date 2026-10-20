import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/hooks/useTheme';
import { useMascotStore } from '@/src/lib/mascotStore';
import { borderRadius, spacing } from '@/src/theme';

const STORAGE_KEY = '@campusflow/selected-mascot';

const MASCOTS = [
  { id: 'bear', name: 'Bouncy Bear', emoji: '🐻', color: '#B86F46', soft: '#FFE7D3', songs: ['🎵 Bear-y good ideas! 🎵', '♪ Wiggle with me! ♪', '🎶 Debug the beat! 🎶'] },
  { id: 'panda', name: 'Panda Pal', emoji: '🐼', color: '#5D7896', soft: '#DFEEFF', songs: ['🎵 Panda says: keep going! 🎵', '♪ Tiny steps, big wins! ♪', '🎶 Chill and create! 🎶'] },
  { id: 'bunny', name: 'Bouncy Bunny', emoji: '🐰', color: '#D66B91', soft: '#FFE1EF', songs: ['🎵 Hop into a new idea! 🎵', '♪ Boing boing, you got this! ♪', '🎶 Study beats activated! 🎶'] },
  { id: 'fox', name: 'Clever Fox', emoji: '🦊', color: '#D66B13', soft: '#FFE4B8', songs: ['🎵 Fox found a clever shortcut! 🎵', '♪ Think sly, build bright! ♪', '🎶 Code, snack, repeat! 🎶'] },
  { id: 'capybara', name: 'Calm Capy', emoji: '🦫', color: '#8B6B4A', soft: '#E9E0D5', songs: ['🎵 No rush, just good vibes! 🎵', '♪ Capybara groove incoming! ♪', '🎶 One calm thought at a time! 🎶'] },
  { id: 'night-guardian', name: 'Night Guardian', emoji: '🦇', color: '#111111', soft: '#F2C94C', songs: ['🎵 The night shift is on! 🎵', '♪ Gold signal, good ideas! ♪', '🎶 Quiet focus, mighty progress! 🎶'] },
] as const;

type Mascot = (typeof MASCOTS)[number];

export function MascotCompanion() {
  const { colors, preference } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<Mascot['id']>('bear');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const visible = useMascotStore((state) => state.visible);
  const initializeMascot = useMascotStore((state) => state.initialize);
  const selected = useMemo(() => MASCOTS.find((mascot) => mascot.id === selectedId) ?? MASCOTS[0], [selectedId]);
  const x = useRef(new Animated.Value(Math.max(18, width - 96))).current;
  const y = useRef(new Animated.Value(Math.max(110, height - 235))).current;
  const bob = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeMascot();
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value && MASCOTS.some((mascot) => mascot.id === value)) setSelectedId(value as Mascot['id']);
    }).catch(() => undefined);
  }, [initializeMascot]);

  useEffect(() => {
    let active = true;
    const wander = () => {
      const nextX = 12 + Math.random() * Math.max(24, width - 86);
      const nextY = insets.top + 88 + Math.random() * Math.max(80, height - insets.top - 250);
      const duration = 3200 + Math.round(Math.random() * 2300);
      Animated.parallel([
        Animated.timing(x, { toValue: nextX, duration, useNativeDriver: true }),
        Animated.timing(y, { toValue: nextY, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(bob, { toValue: -5, duration: 520, useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 520, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => {
        if (active && finished) wander();
      });
    };
    wander();
    return () => { active = false; x.stopAnimation(); y.stopAnimation(); bob.stopAnimation(); };
  }, [bob, height, insets.top, width, x, y]);

  const dance = () => {
    const song = selected.songs[Math.floor(Math.random() * selected.songs.length)];
    setSpeech(song);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(rotation, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: 170, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: .92, duration: 140, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(bob, { toValue: -14, duration: 170, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 170, useNativeDriver: true }),
        Animated.timing(bob, { toValue: -9, duration: 150, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 170, useNativeDriver: true }),
      ]),
    ]).start(() => setTimeout(() => setSpeech(null), 1600));
  };

  const chooseMascot = (mascot: Mascot) => {
    setSelectedId(mascot.id);
    setPickerOpen(false);
    setSpeech(`Meet ${mascot.name}!`);
    void AsyncStorage.setItem(STORAGE_KEY, mascot.id);
    setTimeout(() => setSpeech(null), 1400);
  };

  if (!visible) {
    return null;
  }

  return <>
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="box-none" style={[styles.companion, { transform: [{ translateX: x }, { translateY: Animated.add(y, bob) }, { rotate: rotation.interpolate({ inputRange: [-1, 1], outputRange: ['-13deg', '13deg'] }) }, { scale }] }]}>
        {speech ? <View style={[styles.speech, { backgroundColor: colors.surface, borderColor: selected.soft }]}><Text style={[styles.speechText, { color: colors.text }]}>{speech}</Text></View> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Make ${selected.name} dance`} onPress={dance} style={[styles.petButton, { backgroundColor: preference === 'batman' && selected.id !== 'night-guardian' ? colors.surfaceElevated : selected.color, borderColor: preference === 'batman' ? colors.primary : selected.soft }]}>
          <Text style={styles.petEmoji}>{selected.emoji}</Text>
          <View style={[styles.musicBadge, { backgroundColor: selected.soft }]}><Text style={styles.musicText}>♪</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a mascot" hitSlop={10} onPress={() => setPickerOpen(true)} style={[styles.chooseButton, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}><Ionicons name="color-palette" size={12} color={colors.primary} /></Pressable>
      </Animated.View>
    </View>
    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
      <Pressable style={styles.modalShade} onPress={() => setPickerOpen(false)}>
        <Pressable style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.pickerHeader}><View><Text style={[styles.pickerTitle, { color: colors.text }]}>Choose your campus pet</Text><Text style={[styles.pickerSubtitle, { color: colors.textMuted }]}>Only one mascot wanders with you.</Text></View><Pressable onPress={() => setPickerOpen(false)} style={[styles.closeButton, { backgroundColor: colors.accentBg }]}><Ionicons name="close" size={18} color={colors.primary} /></Pressable></View>
          <View style={styles.mascotGrid}>{MASCOTS.map((mascot) => <Pressable key={mascot.id} accessibilityRole="button" accessibilityLabel={`Select ${mascot.name}`} onPress={() => chooseMascot(mascot)} style={[styles.choice, { backgroundColor: mascot.soft, borderColor: selected.id === mascot.id ? mascot.color : 'transparent' }]}><Text style={styles.choiceEmoji}>{mascot.emoji}</Text><Text style={[styles.choiceName, { color: mascot.color }]}>{mascot.name}</Text>{selected.id === mascot.id ? <Ionicons name="checkmark-circle" size={16} color={mascot.color} /> : null}</Pressable>)}</View>
          <Text style={[styles.pickerHint, { color: colors.textMuted }]}>Tap your pet on any student page to make it dance.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  companion: { position: 'absolute', left: 0, top: 0, width: 74, height: 92, zIndex: 50, alignItems: 'center' },
  petButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#352A72', shadowOpacity: .24, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
  petEmoji: { fontSize: 31, marginTop: 4 },
  musicBadge: { position: 'absolute', right: -8, top: -7, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  musicText: { color: '#5E4A9B', fontSize: 12, fontWeight: '900' },
  chooseButton: { position: 'absolute', left: -7, bottom: 1, width: 23, height: 23, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D7CDFB', shadowColor: '#352A72', shadowOpacity: .16, shadowRadius: 5, elevation: 3 },
  speech: { position: 'absolute', bottom: 67, left: -31, width: 132, backgroundColor: '#FFFDF7', borderRadius: 13, borderBottomLeftRadius: 4, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 7, shadowColor: '#352A72', shadowOpacity: .16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  speechText: { color: '#463A5D', fontSize: 9, lineHeight: 13, fontWeight: '900', textAlign: 'center' },
  modalShade: { flex: 1, backgroundColor: 'rgba(26,19,46,.42)', justifyContent: 'flex-end' },
  picker: { backgroundColor: '#FFFCFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.md, paddingBottom: spacing.lg },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  pickerTitle: { color: '#2B2146', fontSize: 19, fontWeight: '900' },
  pickerSubtitle: { color: '#766B8D', fontSize: 11, marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0EDFF', alignItems: 'center', justifyContent: 'center' },
  mascotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { width: '31%', minHeight: 92, borderRadius: borderRadius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, gap: 4 },
  choiceEmoji: { fontSize: 32 },
  choiceName: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  pickerHint: { color: '#766B8D', fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
