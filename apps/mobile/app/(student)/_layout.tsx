import { Redirect, Stack, usePathname } from 'expo-router';

import { SETUP_PROFILE_ROUTE } from '@/src/lib/auth';
import { useStackLogoHeaderOptions } from '@/src/hooks/useLogoHeaderOptions';
import { useAuthStore } from '@/src/lib/authStore';
import { MascotCompanion } from '@/src/components/MascotCompanion';
import { View } from 'react-native';

export default function StudentLayout() {
  const { user, profile, needsProfileSetup, isAuthLoading } = useAuthStore();
  const pathname = usePathname();
  const notificationsHeader = useStackLogoHeaderOptions('Notifications');
  const createEventHeader = useStackLogoHeaderOptions('Create Event');
  const eventDetailHeader = useStackLogoHeaderOptions('Event Details');
  const myEventsHeader = useStackLogoHeaderOptions('My Events');
  const myRegistrationsHeader = useStackLogoHeaderOptions('My Registrations');
  const attendeesHeader = useStackLogoHeaderOptions('Manage Attendees');
  const eventTicketHeader = useStackLogoHeaderOptions('Event Ticket');
  const eventScanHeader = useStackLogoHeaderOptions('Check In Attendee');
  const eventAnnouncementsHeader = useStackLogoHeaderOptions('Event Signal');
  const competitionDetailHeader = useStackLogoHeaderOptions('Competition Details');
  const profileHeader = useStackLogoHeaderOptions('Profile');
  const doubtHeader = useStackLogoHeaderOptions('Doubt Exchange');
  const focusBlockerHeader = useStackLogoHeaderOptions('Focus Blocker');
  const techPulseHeader = useStackLogoHeaderOptions('Tech Pulse');
  const leetcodeHeader = useStackLogoHeaderOptions('Code Together');
  const networkHeader = useStackLogoHeaderOptions('Campus Network');
  const networkFeedHeader = useStackLogoHeaderOptions('Network Feed');
  const resumeBuilderHeader = useStackLogoHeaderOptions('Resume Builder');

  if (!isAuthLoading && user && needsProfileSetup) {
    return <Redirect href={SETUP_PROFILE_ROUTE} />;
  }

  if (!isAuthLoading && profile && profile.role !== 'STUDENT') {
    if (profile.role === 'HOD') return <Redirect href="/(hod)/(tabs)" />;
    if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') return <Redirect href="/(admin)" />;
    if (profile.role === 'COMPETITIONS_ADMIN') return <Redirect href="/(competitions-admin)/(tabs)" />;
    return <Redirect href="/login" />;
  }

  const needsSignIn = [
    '/profile',
    '/notifications',
    '/events/create',
    '/events/my-events',
    '/events/my-registrations',
  ].some((path) => pathname.includes(path)) || /\/events\/[^/]+\/(attendees|ticket|scan|announcements)$/.test(pathname);

  if (!isAuthLoading && !user && needsSignIn) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 260, animationMatchesGesture: true }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={profileHeader} />
      <Stack.Screen name="notifications" options={notificationsHeader} />
      <Stack.Screen name="events/create" options={createEventHeader} />
      <Stack.Screen name="events/[id]" options={eventDetailHeader} />
      <Stack.Screen name="events/my-events" options={myEventsHeader} />
      <Stack.Screen name="events/my-registrations" options={myRegistrationsHeader} />
      <Stack.Screen name="events/[id]/attendees" options={attendeesHeader} />
      <Stack.Screen name="events/[id]/ticket" options={eventTicketHeader} />
      <Stack.Screen name="events/[id]/scan" options={eventScanHeader} />
      <Stack.Screen name="events/[id]/announcements" options={eventAnnouncementsHeader} />
      <Stack.Screen name="competitions/[id]" options={competitionDetailHeader} />
      <Stack.Screen name="doubts/[id]" options={doubtHeader} />
      <Stack.Screen name="focus-blocker" options={focusBlockerHeader} />
      <Stack.Screen name="tech-pulse" options={techPulseHeader} />
      <Stack.Screen name="leetcode" options={leetcodeHeader} />
      <Stack.Screen name="network" options={networkHeader} />
      <Stack.Screen name="network/[id]" options={networkHeader} />
      <Stack.Screen name="network-feed" options={networkFeedHeader} />
      <Stack.Screen name="resume-builder" options={resumeBuilderHeader} />
      </Stack>
      <MascotCompanion />
    </View>
  );
}
