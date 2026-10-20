import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { EventTypeBadge } from '@/src/components/EventTypeBadge';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import {
  formatEventDateTime,
  getSeatsLabel,
  type EventWithId,
} from '@/src/lib/events';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

interface EventListItemProps {
  event: EventWithId;
  onPress?: () => void;
}

export function EventListItem({ event, onPress }: EventListItemProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isFull = event.maxParticipants !== null && event.registrationCount >= event.maxParticipants;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      {event.posterUrl ? (
        <Image source={{ uri: event.posterUrl }} style={styles.poster} />
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons
            name={event.type === 'HACKATHON' ? 'code-slash-outline' : 'calendar-outline'}
            size={20}
            color={colors.primary}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {formatEventDateTime(event.startAt)} · {event.venue}
        </Text>
        <View style={styles.metaRow}>
          <EventTypeBadge type={event.type} />
          <Text style={[styles.seats, isFull && styles.full]}>{getSeatsLabel(event)}</Text>
        </View>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
      backgroundColor: theme.colors.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    poster: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.colors.accentBg,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 15,
      fontFamily: fontFamilies.display,
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: fontFamilies.body,
      color: theme.colors.textMuted,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    seats: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontWeight: '700',
    },
    full: { color: '#B86800' },
  });
