import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '@/src/hooks/useTheme';

type AnimatedTabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
};

/** A small spring response that makes tab changes feel tactile without slowing navigation. */
export function AnimatedTabIcon({ focused, name, color, size }: AnimatedTabIconProps) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      damping: 12,
      stiffness: 230,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  return (
    <View style={styles.frame}>
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: colors.primary,
            opacity: progress,
            transform: [{ scale: progress }],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        }}
      >
        <Ionicons name={name} size={size - 1} color={focused ? colors.white : color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 31, height: 26, borderRadius: 13 },
});
