import { StyleSheet, Text, View } from 'react-native';
import type { ODRequestStatus } from '@campusflow/shared';

import { formatODStatus, getStatusColor } from '@/src/lib/odRequests';
import { borderRadius, spacing } from '@/src/theme';

export function ODStatusBadge({ status }: { status: ODRequestStatus }) {
  const { text, bg } = getStatusColor(status);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{formatODStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
