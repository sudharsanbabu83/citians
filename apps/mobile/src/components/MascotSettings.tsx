import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useMascotStore } from '@/src/lib/mascotStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export function MascotSettings() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const visible = useMascotStore((state) => state.visible);
  const setVisible = useMascotStore((state) => state.setVisible);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="paw-outline" size={20} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Campus pet</Text>
          <Text style={styles.subtitle}>Control your playful mascot on app screens</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: visible }}
        accessibilityLabel="Show campus pet"
        onPress={() => void setVisible(!visible)}
        style={[styles.toggleRow, visible && styles.toggleRowActive]}
      >
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>{visible ? 'Pet is visible' : 'Pet is hidden'}</Text>
          <Text style={styles.toggleDescription}>{visible ? 'Your mascot can wander and dance.' : 'You can bring it back here anytime.'}</Text>
        </View>
        <View style={[styles.switch, visible && styles.switchActive]}>
          <View style={[styles.knob, visible && styles.knobActive]} />
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1 },
  title: { ...theme.typography.heading, fontSize: 16 },
  subtitle: { ...theme.typography.caption, marginTop: 2 },
  toggleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
  },
  toggleRowActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentBg },
  toggleText: { flex: 1 },
  toggleTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  toggleDescription: { ...theme.typography.caption, marginTop: 2 },
  switch: { width: 48, height: 28, borderRadius: borderRadius.full, padding: 3, justifyContent: 'center', backgroundColor: theme.colors.border },
  switchActive: { backgroundColor: theme.colors.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.surface, alignSelf: 'flex-start' },
  knobActive: { alignSelf: 'flex-end' },
});
