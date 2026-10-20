import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEvent, useEventMutations, useEventRegistrations } from '@/src/hooks/useEvents';
import { isApprovedEventRegistration } from '@/src/lib/events';
import { useAuthStore } from '@/src/lib/authStore';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

export default function EventAttendeesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding();
  const { data: event } = useEvent(id);
  const { data: registrations = [], isLoading, isError, refetch, isRefetching } = useEventRegistrations(id);
  const { approveRegistration, rejectRegistration, approveAll, removeAttendee } = useEventMutations();

  const isOrganizer = event?.organizerUserId === user?.uid;
  const pending = registrations.filter((registration) => registration.status === 'PENDING');
  const waitlisted = registrations.filter((registration) => registration.status === 'WAITLISTED');
  const approved = registrations.filter((registration) => isApprovedEventRegistration(registration.status));

  const approve = async (registrationId: string) => {
    try { await approveRegistration.mutateAsync(registrationId); } catch (error) {
      Alert.alert('Could not approve', error instanceof Error ? error.message : 'Try again.');
    }
  };
  const reject = (registrationId: string) => Alert.alert('Decline registration?', 'The student will be notified.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Decline', style: 'destructive', onPress: async () => {
      try { await rejectRegistration.mutateAsync({ registrationId }); } catch (error) {
        Alert.alert('Could not decline', error instanceof Error ? error.message : 'Try again.');
      }
    } },
  ]);
  const approveEveryone = () => Alert.alert('Approve all pending?', `${pending.length} students will receive QR tickets.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Approve all', onPress: async () => {
      try { await approveAll.mutateAsync(id!); } catch (error) {
        Alert.alert('Could not approve all', error instanceof Error ? error.message : 'Try again.');
      }
    } },
  ]);
  const remove = (registrationId: string, studentName: string) => Alert.alert(
    'Remove attendee?',
    `${studentName}'s pass will stop working immediately. If someone is waitlisted, the first student will move forward automatically.`,
    [
      { text: 'Keep attendee', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await removeAttendee.mutateAsync({ registrationId }); } catch (error) {
          Alert.alert('Could not remove attendee', error instanceof Error ? error.message : 'Try again.');
        }
      } },
    ]
  );

  if (!isOrganizer) return <View style={styles.center}><Text style={styles.errorText}>Only the event organizer can manage attendees.</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}>
      <View style={[styles.summary, styles.cardShadow]}>
        <Text style={styles.title}>{event?.title ?? 'Event'}</Text>
        <Text style={styles.caption}>{approved.length} confirmed · {pending.length} pending · {waitlisted.length} waitlisted</Text>
        <Pressable style={styles.scanButton} onPress={() => router.push(`/(student)/events/${id}/scan` as Href)}>
          <Ionicons name="scan-outline" size={18} color={colors.white} /><Text style={styles.scanText}>Scan attendee QR</Text>
        </Pressable>
        {event?.approvalMode === 'MANUAL' && pending.length > 0 ? (
          <Pressable style={styles.approveAllButton} onPress={approveEveryone} disabled={approveAll.isPending}>
            <Text style={styles.approveAllText}>Approve all pending</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {isError ? <Text style={styles.errorText}>Could not load registrations.</Text> : null}
      {!isLoading && !isError && registrations.length === 0 ? <View style={styles.empty}><Text style={styles.caption}>No students have registered yet.</Text></View> : null}
      {registrations.map((registration) => (
        <View key={registration.id} style={[styles.row, styles.cardShadow]}>
          <View style={styles.rowInfo}>
            <Text style={styles.name}>{registration.studentName}</Text>
            <Text style={styles.meta}>{registration.registerNumber} · {registration.status === 'WAITLISTED' ? 'WAITLIST' : registration.status}</Text>
            {registration.phoneNumber ? <Text style={styles.contact}>☎ {registration.phoneNumber}</Text> : <Text style={styles.missingContact}>Mobile not provided (legacy registration)</Text>}
          </View>
          {registration.status === 'PENDING' ? <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.declineButton]} onPress={() => reject(registration.id)}><Text style={styles.declineText}>Decline</Text></Pressable>
            <Pressable style={[styles.actionButton, styles.approveButton]} onPress={() => approve(registration.id)}><Text style={styles.approveText}>Approve</Text></Pressable>
          </View> : registration.status === 'ATTENDED' ? <View style={styles.attended}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={styles.attendedText}>Checked in</Text></View> : (
            <View style={styles.actions}>
              {registration.status === 'WAITLISTED' ? <Ionicons name="hourglass-outline" size={21} color="#B86800" /> : null}
              <Pressable style={[styles.actionButton, styles.declineButton]} onPress={() => remove(registration.id, registration.studentName)}><Text style={styles.declineText}>Remove</Text></Pressable>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: spacing.md, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.colors.background },
  summary: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm },
  title: { ...theme.typography.heading }, caption: { ...theme.typography.caption },
  scanButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.colors.primary, borderRadius: borderRadius.md, paddingVertical: 12 }, scanText: { color: theme.colors.white, fontWeight: '700' },
  approveAllButton: { alignItems: 'center', paddingVertical: spacing.sm }, approveAllText: { color: theme.colors.primary, fontWeight: '700' },
  loader: { paddingVertical: spacing.lg }, errorText: { color: theme.colors.error, textAlign: 'center' }, empty: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: 'center' },
  row: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, rowInfo: { flex: 1, gap: 3 }, name: { fontSize: 15, fontWeight: '700', color: theme.colors.text }, meta: { fontSize: 12, color: theme.colors.textMuted }, contact: { fontSize: 12, color: theme.colors.text }, missingContact: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' }, actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' }, actionButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' }, declineButton: { borderWidth: 1, borderColor: theme.colors.error }, approveButton: { backgroundColor: theme.colors.primary }, declineText: { color: theme.colors.error, fontSize: 12, fontWeight: '700' }, approveText: { color: theme.colors.white, fontSize: 12, fontWeight: '700' }, attended: { flexDirection: 'row', alignItems: 'center', gap: 4 }, attendedText: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
});
