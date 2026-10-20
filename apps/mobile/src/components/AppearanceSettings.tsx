import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme, ThemePreference } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

const OPTIONS: Array<{
  key: ThemePreference;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'light', label: 'Light', description: 'Clean white interface', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', description: 'Easy on the eyes at night', icon: 'moon-outline' },
  { key: 'system', label: 'System', description: 'Match your phone setting', icon: 'phone-portrait-outline' },
  { key: 'batman', label: 'Batman Mode', description: 'Black-and-gold focus mode', icon: 'shield-half-outline' },
];

export function AppearanceSettings() {
  const { preference, setPreference } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="color-palette-outline" size={20} color={styles.headerIcon.color} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Appearance</Text>
          <Text style={styles.subtitle}>Choose how Citians looks on your device</Text>
        </View>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const active = preference === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setPreference(option.key)}
            >
              <View style={[styles.optionIconWrap, active && styles.optionIconWrapActive]}>
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={active ? styles.optionIconActive.color : styles.optionIcon.color}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={20} color={styles.check.color} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerIcon: {
      color: theme.colors.primary,
    },
    headerText: {
      flex: 1,
    },
    title: {
      ...theme.typography.heading,
      fontSize: 16,
    },
    subtitle: {
      ...theme.typography.caption,
      marginTop: 2,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.inputBg,
    },
    optionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.accentBg,
    },
    optionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    optionIconWrapActive: {
      backgroundColor: theme.colors.primary,
    },
    optionIcon: {
      color: theme.colors.textMuted,
    },
    optionIconActive: {
      color: theme.colors.white,
    },
    optionText: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    optionLabelActive: {
      color: theme.colors.primary,
    },
    optionDescription: {
      ...theme.typography.caption,
      marginTop: 2,
    },
    check: {
      color: theme.colors.primary,
    },
  });
