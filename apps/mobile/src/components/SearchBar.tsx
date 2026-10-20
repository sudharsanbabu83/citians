import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onFocus?: () => void;
  onBlur?: () => void;
  editable?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  compact = false,
  style,
  onFocus,
  onBlur,
  editable = true,
}: SearchBarProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <Ionicons name="search-outline" size={compact ? 16 : 18} color={colors.textMuted} />
      <TextInput
        style={[styles.input, compact && styles.inputCompact]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        editable={editable}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={compact ? 16 : 18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginBottom: spacing.sm,
    },
    wrapCompact: {
      marginBottom: 0,
      borderWidth: 0,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 8,
      backgroundColor: theme.colors.inputBg,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      padding: 0,
    },
    inputCompact: {
      fontSize: 14,
    },
  });
