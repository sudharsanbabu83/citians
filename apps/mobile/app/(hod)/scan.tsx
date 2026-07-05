import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { VerifyODPassResponse } from '@campusflow/shared';

import {
  mapVerifyStatus,
  parseQrScanPayload,
  verifyODPassRemote,
} from '@/src/lib/odPass';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

export default function HodScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerifyODPassResponse | null>(null);
  const [scanLocked, setScanLocked] = useState(false);

  const handleScan = useCallback(async (data: string) => {
    if (scanLocked || isVerifying) return;

    const payload = parseQrScanPayload(data);
    if (!payload) return;

    setScanLocked(true);
    setIsVerifying(true);
    setResult(null);

    try {
      const response = await verifyODPassRemote(payload.approvalId, payload.token);
      setResult(response);
    } catch {
      setResult({ verificationStatus: 'INVALID' });
    } finally {
      setIsVerifying(false);
    }
  }, [scanLocked, isVerifying]);

  const resetScan = () => {
    setResult(null);
    setScanLocked(false);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionCaption}>
          Allow camera access to scan student OD pass QR codes.
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  const statusStyle = result ? mapVerifyStatus(result.verificationStatus) : null;

  return (
    <View style={styles.container}>
      {!result ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => handleScan(data)}
          />
          <View style={styles.overlay}>
            <Text style={styles.scanHint}>Align the OD pass QR code within the frame</Text>
            {isVerifying ? (
              <View style={styles.verifyingRow}>
                <ActivityIndicator color={colors.white} />
                <Text style={styles.verifyingText}>Verifying…</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultContent}>
          <View
            style={[
              styles.resultCard,
              shadows.card,
              { backgroundColor: statusStyle!.bg },
            ]}
          >
            <Ionicons
              name={result.verificationStatus === 'VALID' ? 'checkmark-circle' : 'close-circle'}
              size={56}
              color={statusStyle!.color}
            />
            <Text style={[styles.resultTitle, { color: statusStyle!.color }]}>
              {statusStyle!.label}
            </Text>
          </View>

          {result.verificationStatus === 'VALID' ? (
            <View style={[styles.detailsCard, shadows.card]}>
              <DetailRow label="Student" value={result.studentName ?? '—'} />
              <DetailRow label="Register No." value={result.registerNumber ?? '—'} />
              <DetailRow label="Department" value={result.department ?? '—'} />
              <DetailRow label="Event" value={result.eventName ?? '—'} />
              <DetailRow
                label="Dates"
                value={
                  result.startDate && result.endDate
                    ? `${result.startDate} – ${result.endDate}`
                    : '—'
                }
              />
              <DetailRow label="Approved by" value={result.approvedBy ?? '—'} />
              <DetailRow label="Pass ID" value={result.approvalId ?? '—'} />
            </View>
          ) : null}

          <Pressable style={styles.primaryButton} onPress={resetScan}>
            <Text style={styles.primaryButtonText}>Scan another</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  permissionTitle: { ...typography.heading, marginTop: spacing.sm },
  permissionCaption: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
  cameraWrap: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: spacing.sm,
  },
  scanHint: { color: colors.white, textAlign: 'center', fontSize: 15 },
  verifyingRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  verifyingText: { color: colors.white, fontWeight: '600' },
  resultContent: { padding: spacing.md, gap: spacing.md },
  resultCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: { fontSize: 22, fontWeight: '800' },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  detailRow: { gap: 4 },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  detailValue: { fontSize: 15, color: colors.text, lineHeight: 22 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
});
