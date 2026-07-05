import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ODStatusBadge } from '@/src/components/ODStatusBadge';
import { formatDateRange, type ODRequestWithId } from '@/src/lib/odRequests';
import { borderRadius, colors, spacing } from '@/src/theme';

interface ODRequestListItemProps {
  request: ODRequestWithId;
  onPress?: () => void;
}

export function ODRequestListItem({ request, onPress }: ODRequestListItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {request.eventName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {formatDateRange(request.startDate, request.endDate)}
        </Text>
      </View>
      <ODStatusBadge status={request.status} />
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
