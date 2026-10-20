import { StyleSheet, Text, View } from 'react-native';
import type { CompetitionPlatform } from '@campusflow/shared';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { formatPlatformLabel } from '@/src/lib/competitions';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

function getPlatformColors(
  theme: AppTheme
): Record<CompetitionPlatform, { text: string; bg: string }> {
  const neutral = { text: theme.colors.text, bg: theme.colors.accentBg };
  return {
    DEVPOST: neutral,
    HACKEREARTH: neutral,
    UNSTOP: neutral,
    HACKATHON_COM: neutral,
    CODECHEF: neutral,
    CODEFORCES: neutral,
    OTHER: { text: theme.colors.textMuted, bg: theme.colors.accentBg },
  };
}

interface PlatformBadgeProps {
  platform: CompetitionPlatform;
  platformLabel?: string | null;
}

export function PlatformBadge({ platform, platformLabel }: PlatformBadgeProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = getPlatformColors(theme)[platform];
  const label = formatPlatformLabel(platform, platformLabel);

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
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
      letterSpacing: 0.3,
    },
  });
