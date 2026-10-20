import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

type WelcomeMoment = {
  id: string;
  badge: string;
  emoji: string;
  title: string;
  message: string;
  action: string;
  accent: string;
  softAccent: string;
};

const MOMENTS: WelcomeMoment[] = [
  {
    id: 'next-step',
    badge: 'A LITTLE NUDGE',
    emoji: '🧩',
    title: 'Small progress still counts.',
    message: 'Pick one useful next step and make it easier for future-you.',
    action: 'Try Code Together',
    accent: '#6C4CF6',
    softAccent: '#EEE9FF',
  },
  {
    id: 'build-together',
    badge: 'TODAY’S CAMPUS MOMENT',
    emoji: '🚀',
    title: 'Someone here is building something interesting.',
    message: 'A curious question or a kind reply could become your next collaboration.',
    action: 'Explore the network',
    accent: '#087F73',
    softAccent: '#DDF8F1',
  },
  {
    id: 'tiny-win',
    badge: 'TINY WIN CLUB',
    emoji: '🌈',
    title: 'Small progress still counts as progress.',
    message: 'Take a two-minute challenge today. Future-you will be glad you started.',
    action: 'Try Code Together',
    accent: '#D65F17',
    softAccent: '#FFF0D8',
  },
  {
    id: 'spark-question',
    badge: 'SURPRISE SPARK',
    emoji: '✨',
    title: 'What could you learn in ten focused minutes?',
    message: 'Pick one idea, one question, or one person—and make the first move.',
    action: 'Start a focus session',
    accent: '#C34B78',
    softAccent: '#FFE6F0',
  },
];

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function getMomentIndex() {
  return Math.floor(Date.now() / 86_400_000) % MOMENTS.length;
}

type StudentWelcomeMomentProps = {
  onAction: (momentId: string) => void;
};

export function StudentWelcomeMoment({ onAction }: StudentWelcomeMomentProps) {
  const styles = useThemedStyles(createStyles);
  const moment = useMemo(() => MOMENTS[getMomentIndex()], []);
  const [visible, setVisible] = useState<boolean | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const storageKey = `citians.welcome-moment.${getTodayKey()}`;

    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!mounted) return;
        setVisible(value !== 'dismissed');
        if (value !== 'dismissed') {
          Animated.timing(entrance, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {
        if (mounted) setVisible(true);
      });

    return () => {
      mounted = false;
    };
  }, [entrance]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(`citians.welcome-moment.${getTodayKey()}`, 'dismissed').catch(() => undefined);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        },
      ]}
    >
      <View style={[styles.orb, styles.orbOne, { backgroundColor: moment.softAccent }]} />
      <View style={[styles.orb, styles.orbTwo, { backgroundColor: `${moment.accent}22` }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: moment.softAccent }]}>
            <Text style={[styles.badgeText, { color: moment.accent }]}>{moment.badge}</Text>
          </View>
          <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss today’s campus moment">
            <Text style={styles.dismiss}>×</Text>
          </Pressable>
        </View>
        <View style={styles.messageRow}>
          <View style={[styles.emojiBubble, { backgroundColor: moment.accent }]}>
            <Text style={styles.emoji}>{moment.emoji}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{moment.title}</Text>
            <Text style={styles.message}>{moment.message}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.action, { backgroundColor: moment.accent }]}
          onPress={() => onAction(moment.id)}
          accessibilityRole="button"
          accessibilityLabel={moment.action}
        >
          <Text style={styles.actionText}>{moment.action}</Text>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      marginBottom: spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: '#E9E1F8',
      shadowColor: '#30254E',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    orb: { position: 'absolute', borderRadius: 999 },
    orbOne: { width: 150, height: 150, right: -56, top: -76, opacity: 0.7 },
    orbTwo: { width: 120, height: 120, left: -58, bottom: -72, opacity: 0.65 },
    content: { padding: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },
    badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    dismiss: { color: '#89819A', fontSize: 25, lineHeight: 22, fontWeight: '300' },
    messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    emojiBubble: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
    emoji: { fontSize: 28 },
    copy: { flex: 1 },
    title: { color: theme.colors.text, fontSize: 18, lineHeight: 22, fontFamily: fontFamilies.display },
    message: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
    action: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, marginTop: spacing.md },
    actionText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    actionArrow: { color: '#FFF', fontSize: 16, lineHeight: 14 },
  });
