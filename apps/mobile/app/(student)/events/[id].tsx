import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { EventTypeBadge } from '@/src/components/EventTypeBadge';
import { EventRegistrationSheet } from '@/src/components/EventRegistrationSheet';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useLoginRequired } from '@/src/hooks/useLoginRequired';
import {
  useEvent,
  useEventMutations,
  useEventRegistration,
} from '@/src/hooks/useEvents';
import {
  formatEventDateTime,
  getSeatsLabel,
  isApprovedEventRegistration,
  isEventFull,
  isRegistrationOpen,
} from '@/src/lib/events';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, spacing } from '@/src/theme';

export default function EventDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const [showRegistration, setShowRegistration] = useState(false);
  const requireLogin = useLoginRequired();
  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const { data: registration, refetch: refetchRegistration } = useEventRegistration(user?.uid, id);
  const { register, unregister, cancel } = useEventMutations();
  const bottomPadding = useBottomContentPadding();

  const isOrganizer = event?.organizerUserId === user?.uid;
  const isRegistered = !!registration;
  const isApproved = registration ? isApprovedEventRegistration(registration.status) : false;
  const isPending = registration?.status === 'PENDING';
  const isWaitlisted = registration?.status === 'WAITLISTED';
  const eventIsFull = event ? isEventFull(event) : false;
  const canRegister =
    !!event &&
    !isOrganizer &&
    !isRegistered &&
    isRegistrationOpen(event);

  const openRegistration = () => {
    if (!requireLogin('register for this event')) return;
    setShowRegistration(true);
  };

  const handleRegister = async (details: { attendeeName: string; registerNumber: string; phoneNumber: string }) => {
    if (!id) return;
    try {
      const result = await register.mutateAsync({ eventId: id, ...details });
      setShowRegistration(false);
      Alert.alert(
        result.status === 'WAITLISTED' ? 'Waitlist joined' : result.status === 'PENDING' ? 'Request sent' : 'Seat confirmed',
        result.status === 'WAITLISTED'
          ? 'The event is full. You will automatically move forward when a seat opens.'
          : result.status === 'PENDING'
            ? 'The organizer will review your registration.'
            : 'Your QR ticket is ready.'
      );
      refetch();
      refetchRegistration();
    } catch (error) {
      Alert.alert('Registration failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const handleUnregister = async () => {
    if (!id) return;
    Alert.alert(isWaitlisted ? 'Leave waitlist?' : 'Cancel registration?', isWaitlisted ? 'You will lose your place in the queue.' : 'The next waitlisted student may receive your spot.', [
      { text: isWaitlisted ? 'Stay in queue' : 'Keep registration', style: 'cancel' },
      {
        text: isWaitlisted ? 'Leave waitlist' : 'Cancel registration',
        style: 'destructive',
        onPress: async () => {
          try {
            await unregister.mutateAsync(id);
            refetch();
            refetchRegistration();
          } catch (error) {
            Alert.alert(
              'Could not unregister',
              error instanceof Error ? error.message : 'Try again.'
            );
          }
        },
      },
    ]);
  };

  const handleCancelEvent = async () => {
    if (!id) return;
    Alert.alert('Cancel event?', 'All registered students will be notified.', [
      { text: 'Keep event', style: 'cancel' },
      {
        text: 'Cancel event',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel.mutateAsync({ eventId: id });
            refetch();
          } catch (error) {
            Alert.alert('Could not cancel', error instanceof Error ? error.message : 'Try again.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Event not found.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={[styles.card, styles.cardShadow]}>
        {event.posterUrl ? (
          <Image source={{ uri: event.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : null}
        <EventTypeBadge type={event.type} />
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.organizer}>Hosted by {event.organizerName}</Text>
        <Text style={styles.description}>{event.description}</Text>

        <DetailRow icon="location-outline" label="Venue" value={event.venue} />
        <DetailRow icon="time-outline" label="Starts" value={formatEventDateTime(event.startAt)} />
        <DetailRow icon="time-outline" label="Ends" value={formatEventDateTime(event.endAt)} />
        <DetailRow
          icon="hourglass-outline"
          label="Registration closes"
          value={formatEventDateTime(event.registrationDeadline)}
        />
        <DetailRow icon="people-outline" label="Seats" value={getSeatsLabel(event)} />
        <DetailRow
          icon="globe-outline"
          label="Audience"
          value={event.departmentId ? 'Department event' : 'College-wide'}
        />
        {event.maxParticipants !== null ? (
          <View style={styles.capacityCard}>
            <View style={styles.capacityTop}>
              <Text style={styles.capacityTitle}>Live capacity</Text>
              <Text style={styles.capacityValue}>{event.registrationCount}/{event.maxParticipants}</Text>
            </View>
            <View style={styles.capacityTrack}>
              <View style={[styles.capacityFill, { width: `${Math.min(100, (event.registrationCount / event.maxParticipants) * 100)}%` }]} />
            </View>
            <Text style={styles.capacityHint}>
              {eventIsFull
                ? `${event.waitlistCount ?? 0} waiting · the queue advances automatically when a seat opens`
                : 'Seats are reserved atomically, even during a registration rush.'}
            </Text>
          </View>
        ) : null}
      </View>

      {event.status === 'CANCELLED' ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>This event has been cancelled.</Text>
        </View>
      ) : null}

      {isOrganizer && event.status === 'PENDING_ADMIN_REVIEW' ? (
        <View style={[styles.banner, styles.bannerMuted]}>
          <Text style={styles.bannerTextMuted}>This event is waiting for admin verification. Students cannot register yet.</Text>
        </View>
      ) : null}

      {isOrganizer && event.status === 'REJECTED' ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>This event was rejected by an admin. Please update it and submit it again for review.</Text>
        </View>
      ) : null}

      {isPending ? (
        <View style={[styles.banner, styles.bannerMuted]}>
          <Text style={styles.bannerTextMuted}>Your registration is waiting for organizer approval.</Text>
        </View>
      ) : null}

      {isWaitlisted ? (
        <View style={[styles.banner, styles.waitlistBanner]}>
          <Ionicons name="hourglass-outline" size={19} color="#8A4B00" />
          <View style={styles.bannerCopy}>
            <Text style={styles.waitlistTitle}>You’re on the waitlist</Text>
            <Text style={styles.waitlistText}>No refreshing needed—we’ll move you forward and notify you when a seat opens.</Text>
          </View>
        </View>
      ) : null}

      {isApproved ? (
        <>
          <Pressable style={styles.broadcastButton} onPress={() => router.push(`/(student)/events/${id}/announcements` as Href)}>
            <View style={styles.broadcastIcon}><Ionicons name="radio-outline" size={20} color="#6750A4" /></View>
            <View style={styles.broadcastCopy}><Text style={styles.broadcastTitle}>Event Signal</Text><Text style={styles.broadcastCaption}>Live announcements from your host</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => router.push(`/(student)/events/${id}/ticket` as Href)}>
            <Text style={styles.primaryButtonText}>View QR ticket</Text>
          </Pressable>
        </>
      ) : null}

      {isRegistered && registration?.status !== 'ATTENDED' ? (
        <Pressable
          style={[styles.primaryButton, styles.dangerButton]}
          onPress={handleUnregister}
          disabled={unregister.isPending}
        >
          {unregister.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{isWaitlisted ? 'Leave waitlist' : 'Cancel registration'}</Text>
          )}
        </Pressable>
      ) : canRegister ? (
        <Pressable
          style={styles.primaryButton}
          onPress={openRegistration}
          disabled={register.isPending}
        >
          {register.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{eventIsFull ? 'Join waitlist' : 'Reserve my seat'}</Text>
          )}
        </Pressable>
      ) : !isOrganizer && event.status === 'PUBLISHED' ? (
        <View style={[styles.banner, styles.bannerMuted]}>
          <Text style={styles.bannerTextMuted}>
            Registration is closed.
          </Text>
        </View>
      ) : null}

      {isOrganizer && event.status === 'PUBLISHED' ? (
        <>
          <Pressable style={styles.broadcastButton} onPress={() => router.push(`/(student)/events/${id}/announcements` as Href)}>
            <View style={styles.broadcastIcon}><Ionicons name="megaphone-outline" size={20} color="#6750A4" /></View>
            <View style={styles.broadcastCopy}><Text style={styles.broadcastTitle}>Broadcast to attendees</Text><Text style={styles.broadcastCaption}>Publish updates and track acknowledgements</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push(`/(student)/events/${id}/attendees` as Href)}
          >
            <Text style={styles.primaryButtonText}>Manage attendees</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push(`/(student)/events/${id}/scan` as Href)}
          >
            <Text style={styles.secondaryButtonText}>Scan attendee QR</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, cancel.isPending && styles.submitDisabled]}
            onPress={handleCancelEvent}
            disabled={cancel.isPending}
          >
            <Text style={styles.secondaryButtonText}>Cancel event</Text>
          </Pressable>
        </>
      ) : null}

      <EventRegistrationSheet
        visible={showRegistration}
        eventTitle={event.title}
        approvalMode={event.approvalMode}
        isWaitlist={eventIsFull}
        initialName={profile?.name ?? ''}
        initialRegisterNumber={roleProfile?.type === 'STUDENT' ? roleProfile.data.registerNumber : ''}
        initialPhone={profile?.phone ?? ''}
        isSubmitting={register.isPending}
        onClose={() => setShowRegistration(false)}
        onSubmit={handleRegister}
      />
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  poster: { width: '100%', height: 190, borderRadius: borderRadius.md, backgroundColor: theme.colors.accentBg, marginBottom: spacing.xs },
  title: { ...theme.typography.title, marginTop: spacing.xs },
  organizer: { ...theme.typography.caption },
  description: { ...theme.typography.body, marginVertical: spacing.sm },
  detailRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  detailValue: { fontSize: 15, color: theme.colors.text, marginTop: 2 },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButton: { backgroundColor: theme.colors.error },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  banner: { borderRadius: borderRadius.md, padding: spacing.md },
  bannerError: { backgroundColor: theme.colors.errorBg },
  bannerMuted: { backgroundColor: theme.colors.background },
  bannerText: { color: theme.colors.error, fontWeight: '600', textAlign: 'center' },
  bannerTextMuted: { color: theme.colors.textMuted, textAlign: 'center' },
  waitlistBanner: { backgroundColor: '#FFF2D6', flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bannerCopy: { flex: 1 },
  waitlistTitle: { color: '#6F3D00', fontWeight: '800', marginBottom: 3 },
  waitlistText: { color: '#8A5A1F', fontSize: 12, lineHeight: 17 },
  capacityCard: { marginTop: spacing.sm, borderRadius: borderRadius.md, backgroundColor: theme.colors.background, padding: spacing.md },
  capacityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capacityTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  capacityValue: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  capacityTrack: { height: 7, borderRadius: 4, backgroundColor: theme.colors.border, overflow: 'hidden', marginVertical: spacing.sm },
  capacityFill: { height: '100%', borderRadius: 4, backgroundColor: theme.colors.primary },
  capacityHint: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
  errorText: { color: theme.colors.error, fontWeight: '600' },
  submitDisabled: { opacity: 0.7 },
  broadcastButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.md, padding: spacing.md },
  broadcastIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' },
  broadcastCopy: { flex: 1 },
  broadcastTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  broadcastCaption: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
