import { Ionicons } from '@expo/vector-icons';
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
import { usePublishedSparks } from '@/src/hooks/useContent';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

type Spark = {
  id: string;
  category: string;
  eyebrow: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  takeaway: string;
};

const SPARKS: Spark[] = [
  {
    id: 'emotion-memory',
    category: 'Mind & behaviour',
    eyebrow: 'Only 18% got this right 👀',
    question: 'Why do embarrassing moments stay in our memory for so long?',
    options: ['They feel emotional', 'They happen at night', 'They are always repeated', 'The brain records everything equally'],
    answer: 0,
    explanation: 'Emotion tells your brain that an event matters, so it gives the memory extra attention.',
    takeaway: 'Strong feelings can make memories stick—not just good ones.',
  },
  {
    id: 'ai-prompt',
    category: 'Technology',
    eyebrow: 'A 30-second tech reality check',
    question: 'Why can an AI give different answers to the same question?',
    options: ['It predicts from context', 'It has a mood', 'It reads your mind', 'It always searches live data'],
    answer: 0,
    explanation: 'AI generates responses from patterns and context, so small changes can influence what it predicts next.',
    takeaway: 'Clear context and specific prompts usually produce more useful answers.',
  },
  {
    id: 'money-inflation',
    category: 'Money decoded',
    eyebrow: 'This affects your everyday spending 💸',
    question: 'What does inflation reduce when prices rise?',
    options: ['The buying power of money', 'The number of hours in a day', 'The value of every object', 'Your bank account number'],
    answer: 0,
    explanation: 'When prices rise, the same amount of money buys fewer goods and services than before.',
    takeaway: 'Inflation is about purchasing power—not money simply disappearing.',
  },
];

function getDayIndex() {
  const day = Math.floor(Date.now() / 86_400_000);
  return day % SPARKS.length;
}

function getTodayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${date}`;
}

export function DailySparkCard() {
  const styles = useThemedStyles(createStyles);
  const { data: publishedSparks = [] } = usePublishedSparks();
  const spark = useMemo(() => {
    const available = publishedSparks.length > 0 ? publishedSparks : SPARKS;
    return available[getDayIndex() % available.length];
  }, [publishedSparks]);
  const [selected, setSelected] = useState<number | null>(null);
  const [savedToday, setSavedToday] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(`citians.daily-spark.${spark.id}.${getTodayKey()}`)
      .then((value) => {
        if (mounted && value !== null) {
          const answer = Number(value);
          if (Number.isInteger(answer) && answer >= 0 && answer < spark.options.length) {
            setSelected(answer);
            setSavedToday(true);
          }
        }
      })
      .catch(() => undefined);

    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      mounted = false;
    };
  }, [entrance, spark.id]);

  const chooseAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setSavedToday(true);
    AsyncStorage.setItem(
      `citians.daily-spark.${spark.id}.${getTodayKey()}`,
      String(index),
    ).catch(() => undefined);
  };

  const reset = () => setSelected(null);
  const answeredCorrectly = selected === spark.answer;
  const isAnswered = selected !== null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.sparkLabel}>
          <Text style={styles.sparkIcon}>✦</Text>
          <Text style={styles.sparkLabelText}>DAILY SPARK</Text>
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{spark.category}</Text>
        </View>
      </View>

      {!isAnswered ? (
        <>
          <Text style={styles.eyebrow}>{spark.eyebrow}</Text>
          <Text style={styles.question}>{spark.question}</Text>
          <View style={styles.options}>
            {spark.options.map((option, index) => (
              <Pressable key={option} style={styles.option} onPress={() => chooseAnswer(index)}>
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>{String.fromCharCode(65 + index)}</Text>
                </View>
                <Text style={styles.optionText}>{option}</Text>
                <Ionicons name="arrow-forward" size={16} color="#52627A" />
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}><Ionicons name="timer-outline" size={13} color="#52627A" />  A tiny challenge for your brain</Text>
        </>
      ) : (
        <View style={styles.reveal}>
          <Text style={styles.resultEmoji}>{answeredCorrectly ? '🎉' : '💡'}</Text>
          <Text style={styles.resultTitle}>{answeredCorrectly ? 'Nice one!' : 'Good guess!'}</Text>
          <Text style={styles.answerLabel}>THE ANSWER: {spark.options[spark.answer]}</Text>
          <Text style={styles.explanation}>{spark.explanation}</Text>
          <View style={styles.takeaway}>
            <Text style={styles.takeawayLabel}>TAKEAWAY</Text>
            <Text style={styles.takeawayText}>{spark.takeaway}</Text>
          </View>
          <View style={styles.resultFooter}>
            <Text style={styles.points}>+20 points · {savedToday ? 'Spark complete' : 'Today'}</Text>
            <Pressable onPress={reset} style={styles.replayButton}>
              <Text style={styles.replayText}>Replay</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: '#F0D8D0',
      shadowColor: '#22324A',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
      elevation: 3,
      overflow: 'hidden',
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sparkLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    sparkIcon: { color: '#E87861', fontSize: 22, lineHeight: 22 },
    sparkLabelText: { color: '#263B59', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
    categoryPill: { backgroundColor: '#E6F4EF', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },
    categoryText: { color: '#287461', fontSize: 11, fontWeight: '700' },
    eyebrow: { color: '#C55D4E', fontSize: 13, fontWeight: '700', marginBottom: 7 },
    question: { color: '#263B59', fontSize: 23, lineHeight: 28, fontFamily: fontFamilies.display, letterSpacing: -0.3, marginBottom: spacing.md },
    options: { gap: 8 },
    option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4EC', borderRadius: 14, padding: 8, paddingRight: 12 },
    optionLetter: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F7C9B8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    optionLetterText: { color: '#81483D', fontWeight: '800', fontSize: 13 },
    optionText: { color: '#263B59', flex: 1, fontSize: 14, fontWeight: '600' },
    hint: { color: '#52627A', fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
    reveal: { alignItems: 'center' },
    resultEmoji: { fontSize: 34, marginBottom: 3 },
    resultTitle: { color: '#263B59', fontSize: 24, fontFamily: fontFamilies.display, marginBottom: spacing.sm },
    answerLabel: { color: '#287461', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
    explanation: { color: '#52627A', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing.sm },
    takeaway: { width: '100%', backgroundColor: '#F0ECFA', borderRadius: 14, padding: spacing.sm, marginTop: spacing.md },
    takeawayLabel: { color: '#695A9C', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    takeawayText: { color: '#3E3761', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
    resultFooter: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    points: { color: '#C55D4E', fontSize: 12, fontWeight: '800' },
    replayButton: { paddingHorizontal: 10, paddingVertical: 6 },
    replayText: { color: '#52627A', fontSize: 12, fontWeight: '700' },
  });
