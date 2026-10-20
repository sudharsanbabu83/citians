import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import type { AppTheme } from '@/src/lib/themeStore';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { borderRadius, spacing } from '@/src/theme';

interface HypeToastProps {
  message: string | null;
  onHide?: () => void;
}

export function HypeToast({ message, onHide }: HypeToastProps) {
  const styles = useThemedStyles(createStyles);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (!message) {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(16, { duration: 180 });
      return;
    }

    opacity.value = withSpring(1);
    translateY.value = withSpring(0);

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 220 });
      translateY.value = withTiming(16, { duration: 220 });
      onHide?.();
    }, 2400);

    return () => clearTimeout(timer);
  }, [message, onHide, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  return (
    <Animated.View style={[styles.wrap, animatedStyle]} pointerEvents="none">
      <View style={[styles.toast, styles.heroShadow]}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    heroShadow: theme.shadows.hero,
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 96,
    zIndex: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  emoji: {
    fontSize: 18,
  },
  text: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
});
