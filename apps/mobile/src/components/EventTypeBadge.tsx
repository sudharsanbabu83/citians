import { StyleSheet, Text, View } from 'react-native';
import type { EventType } from '@campusflow/shared';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { formatEventType } from '@/src/lib/events';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

function getTypeColors(theme: AppTheme): Record<EventType, { text: string; bg: string }> {
  const neutral = { text: theme.colors.text, bg: theme.colors.accentBg };
  return {
    EVENT: neutral,
    HACKATHON: neutral,
    WORKSHOP: neutral,
    MEETUP: neutral,
  };
}

interface EventTypeBadgeProps {
  type: EventType;
}

export function EventTypeBadge({ type }: EventTypeBadgeProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = getTypeColors(theme)[type];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{formatEventType(type)}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    text: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
