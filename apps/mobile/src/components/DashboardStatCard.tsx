import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  tint: string;
  bg: string;
}

export function DashboardStatCard({ label, value, tint, bg }: DashboardStatCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.statCard, styles.cardShadow]}>
      <View style={[styles.statIconBg, { backgroundColor: bg }]}>
        <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    cardShadow: theme.shadows.card,
    statIconBg: {
      width: '100%',
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });
