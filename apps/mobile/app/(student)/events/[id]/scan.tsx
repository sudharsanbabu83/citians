import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EventCheckInResult } from '@campusflow/shared';

import { checkInEventAttendee } from '@/src/lib/eventsApi';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

function parseEventTicket(value: string): { registrationId: string; ticketToken: string } | null {
  const [prefix, registrationId, ticketToken] = value.split(':');
  return prefix === 'CITIANS-EVENT' && registrationId && ticketToken ? { registrationId, ticketToken } : null;
}

export default function EventCheckInScreen() {
  const { colors } = useTheme(); const styles = useThemedStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false); const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<EventCheckInResult | null>(null); const bottomPadding = useBottomContentPadding();
  const scan = useCallback(async (value: string) => {
    if (locked || checking) return;
    const parsed = parseEventTicket(value); if (!parsed) return;
    setLocked(true); setChecking(true);
    try { setResult(await checkInEventAttendee(parsed.registrationId, parsed.ticketToken)); }
    catch { setResult({ status: 'INVALID' }); } finally { setChecking(false); }
  }, [checking, locked]);
  const reset = () => { setLocked(false); setResult(null); };
  if (!permission) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!permission.granted) return <View style={styles.center}><Ionicons name="camera-outline" size={48} color={colors.textMuted} /><Text style={styles.title}>Camera access needed</Text><Text style={styles.caption}>Allow camera access to check attendees in.</Text><Pressable style={styles.primaryButton} onPress={requestPermission}><Text style={styles.primaryText}>Grant permission</Text></Pressable></View>;
  if (!result) return <View style={styles.container}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => scan(data)} /><View style={styles.overlay}><Text style={styles.overlayText}>Align the attendee QR ticket in the frame</Text>{checking ? <ActivityIndicator color={colors.white} /> : null}</View></View>;
  const valid = result.status === 'VALID'; const duplicate = result.status === 'ALREADY_CHECKED_IN';
  return <ScrollView contentContainerStyle={[styles.resultContent, { paddingBottom: bottomPadding }]}><View style={[styles.resultCard, valid ? styles.validCard : styles.invalidCard]}><Ionicons name={valid ? 'checkmark-circle' : duplicate ? 'alert-circle' : 'close-circle'} size={56} color={valid ? colors.success : colors.error} /><Text style={styles.title}>{valid ? 'Attendance confirmed' : duplicate ? 'Already checked in' : 'Invalid ticket'}</Text>{result.studentName ? <Text style={styles.caption}>{result.studentName} · {result.registerNumber}</Text> : null}{result.eventTitle ? <Text style={styles.caption}>{result.eventTitle}</Text> : null}</View><Pressable style={styles.primaryButton} onPress={reset}><Text style={styles.primaryText}>Scan another</Text></Pressable></ScrollView>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, camera: { flex: 1 }, overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.55)' }, overlayText: { color: theme.colors.white, textAlign: 'center', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm, backgroundColor: theme.colors.background }, resultContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.md, backgroundColor: theme.colors.background }, resultCard: { borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm }, validCard: { backgroundColor: theme.colors.successBg }, invalidCard: { backgroundColor: theme.colors.errorBg }, title: { ...theme.typography.heading, textAlign: 'center' }, caption: { ...theme.typography.caption, textAlign: 'center' }, primaryButton: { backgroundColor: theme.colors.primary, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: 'center' }, primaryText: { color: theme.colors.white, fontWeight: '700' },
});
