import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, shadows, spacing } from '@/src/theme';

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  tint: string;
  bg: string;
}

export function DashboardStatCard({ label, value, tint, bg }: DashboardStatCardProps) {
  return (
    <View style={[styles.statCard, shadows.card]}>
      <View style={[styles.statIconBg, { backgroundColor: bg }]}>
        <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
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
    color: colors.textMuted,
    textAlign: 'center',
  },
});
