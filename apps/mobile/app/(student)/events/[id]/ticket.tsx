import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { getEventTicket } from '@/src/lib/eventsApi';
import { useTheme } from '@/src/hooks/useTheme';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export default function EventTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding();
  const { width } = useWindowDimensions();
  const qrSize = Math.max(176, Math.min(240, width - 96));
  const { data: ticket, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['eventTicket', id],
    queryFn: () => getEventTicket(id!),
    enabled: !!id,
    retry: 2,
    staleTime: 0,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (isError || !ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Ticket unavailable</Text>
        <Text style={styles.errorCaption}>{error instanceof Error ? error.message : 'Your registration must be approved before a QR ticket is issued.'}</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()} disabled={isFetching}>
          {isFetching ? <ActivityIndicator color={colors.white} /> : <Text style={styles.retryText}>Try again</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={[styles.ticket, styles.cardShadow]}>
        <Text style={styles.eyebrow}>ADMISSION TICKET</Text>
        <Text style={styles.title}>{ticket.eventTitle}</Text>
        <View style={styles.qrWrap}>
          <QRCode value={ticket.qrValue} size={qrSize} color="#111111" backgroundColor="#FFFFFF" quietZone={4} />
        </View>
        <Text style={styles.caption}>Show this code to the organizer at the event entrance. It can be checked in once.</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, padding: spacing.md, justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm, backgroundColor: theme.colors.background },
    ticket: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
    eyebrow: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
    title: { ...theme.typography.heading, textAlign: 'center' },
    qrWrap: { padding: spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.md },
    caption: { ...theme.typography.caption, textAlign: 'center', lineHeight: 20 },
    errorTitle: { ...theme.typography.heading, color: theme.colors.error },
    errorCaption: { ...theme.typography.caption, textAlign: 'center' },
    retryButton: { marginTop: spacing.sm, minWidth: 120, minHeight: 44, borderRadius: borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
    retryText: { color: theme.colors.white, fontWeight: '700' },
  });
