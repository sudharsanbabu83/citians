import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useODPassQrPayload } from '@/src/hooks/useODPass';
import { formatDateRange } from '@/src/lib/odRequests';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function ODPassScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const { data: pass, isLoading, isError, error } = useODPassQrPayload(requestId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your OD pass…</Text>
      </View>
    );
  }

  if (isError || !pass) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={styles.errorTitle}>Pass unavailable</Text>
        <Text style={styles.errorCaption}>
          {(error as Error)?.message ?? 'Could not load your digital OD pass.'}
        </Text>
      </View>
    );
  }

  const isActive = pass.status === 'ACTIVE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.passCard, shadows.card]}>
        <View style={styles.passHeader}>
          <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          <Text style={styles.passTitle}>Digital OD Pass</Text>
        </View>

        <Text style={styles.eventName}>{pass.eventName}</Text>
        <Text style={styles.dates}>{formatDateRange(pass.startDate, pass.endDate)}</Text>
        <Text style={styles.approvalId}>ID: {pass.approvalId}</Text>

        <View style={[styles.statusBadge, !isActive && styles.statusBadgeInactive]}>
          <Text style={[styles.statusText, !isActive && styles.statusTextInactive]}>
            {pass.status}
          </Text>
        </View>

        {isActive ? (
          <View style={styles.qrWrap}>
            <QRCode value={pass.qrValue} size={220} backgroundColor={colors.white} />
          </View>
        ) : (
          <View style={styles.inactiveWrap}>
            <Ionicons name="close-circle-outline" size={48} color={colors.error} />
            <Text style={styles.inactiveText}>This pass is no longer valid for scanning.</Text>
          </View>
        )}
      </View>

      <View style={[styles.infoCard, shadows.card]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Show this QR code at the gate or security checkpoint. Screenshots may fail verification —
          use the live pass from this screen.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  loadingText: { ...typography.caption },
  errorTitle: { ...typography.heading, marginTop: spacing.sm },
  errorCaption: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
  passCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  passTitle: { ...typography.title, fontSize: 20 },
  eventName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  dates: { fontSize: 14, color: colors.textMuted },
  approvalId: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  statusBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginVertical: spacing.sm,
  },
  statusBadgeInactive: { backgroundColor: colors.errorBg },
  statusText: { color: colors.success, fontWeight: '700', fontSize: 12 },
  statusTextInactive: { color: colors.error },
  qrWrap: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  inactiveWrap: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  inactiveText: { ...typography.caption, textAlign: 'center' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },
});
