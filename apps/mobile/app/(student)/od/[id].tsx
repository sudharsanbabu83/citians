import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ODStatusBadge } from '@/src/components/ODStatusBadge';
import { useSubmitODRequest } from '@/src/hooks/useODMutations';
import { fetchRequestDocuments } from '@/src/lib/odDocuments';
import {
  fetchODRequestById,
  formatDateRange,
  formatRequestDate,
} from '@/src/lib/odRequests';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function mapCallableError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === 'functions/failed-precondition') return message || 'Cannot submit this request.';
  return message || 'Submission failed. Please try again.';
}

export default function ODRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const submitRequest = useSubmitODRequest();

  const { data: request, isLoading, isError, refetch } = useQuery({
    queryKey: ['odRequest', id],
    queryFn: () => fetchODRequestById(id!),
    enabled: !!id,
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['odDocuments', id],
    queryFn: () => fetchRequestDocuments(id!),
    enabled: !!id,
  });

  const canEdit =
    request?.status === 'DRAFT' || request?.status === 'CHANGES_REQUESTED';

  const onSubmitForReview = () => {
    if (!request) return;

    Alert.alert(
      'Submit for review',
      'Send this OD request to your HOD for approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await submitRequest.mutateAsync({
                requestId: request.id,
                eventName: request.eventName,
                purpose: request.purpose,
                organizer: request.organizer,
                location: request.location,
                startDate: request.startDate,
                endDate: request.endDate,
                reason: request.reason,
                documentIds:
                  documents && documents.length > 0
                    ? documents.map((d) => d.id)
                    : undefined,
              });
              Alert.alert('Submitted', 'Your OD request has been sent to your HOD.');
              refetch();
            } catch (err) {
              Alert.alert('Error', mapCallableError(err));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !request) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={styles.errorTitle}>Request not found</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.linkText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {request.status === 'CHANGES_REQUESTED' && request.changeComment ? (
        <View style={styles.changeBanner}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.warning} />
          <View style={styles.changeBannerText}>
            <Text style={styles.changeBannerTitle}>HOD requested changes</Text>
            <Text style={styles.changeBannerBody}>{request.changeComment}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.headerCard, shadows.card]}>
        <Text style={styles.eventName}>{request.eventName}</Text>
        <ODStatusBadge status={request.status} />
      </View>

      <View style={[styles.card, shadows.card]}>
        <DetailRow label="Purpose" value={request.purpose} />
        <DetailRow label="Organizer" value={request.organizer} />
        <DetailRow label="Location" value={request.location} />
        <DetailRow
          label="Dates"
          value={formatDateRange(request.startDate, request.endDate)}
        />
        <DetailRow label="Reason" value={request.reason} />
      </View>

      <View style={[styles.card, shadows.card]}>
        <Text style={styles.sectionTitle}>Documents</Text>
        {loadingDocs ? (
          <ActivityIndicator color={colors.primary} />
        ) : documents && documents.length > 0 ? (
          documents.map((doc) => (
            <View key={doc.id} style={styles.docRow}>
              <Ionicons name="document-outline" size={18} color={colors.primary} />
              <Text style={styles.docName} numberOfLines={1}>
                {doc.fileName}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyDocs}>No documents attached</Text>
        )}
      </View>

      <View style={[styles.card, shadows.card]}>
        <DetailRow label="Submitted" value={formatRequestDate(request.submittedAt)} />
        <DetailRow label="Reviewed" value={formatRequestDate(request.reviewedAt)} />
        {request.rejectionReason ? (
          <DetailRow label="Rejection reason" value={request.rejectionReason} />
        ) : null}
        {request.hodComment ? (
          <DetailRow label="HOD comment" value={request.hodComment} />
        ) : null}
      </View>

      {canEdit ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryButton, shadows.card]}
            onPress={() =>
              router.push(`/(student)/od/apply?id=${request.id}` as Href)
            }
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, submitRequest.isPending && styles.buttonDisabled]}
            onPress={onSubmitForReview}
            disabled={submitRequest.isPending}
          >
            {submitRequest.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Submit for Review</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {request.status === 'APPROVED' ? (
        <Pressable
          style={[styles.passButton, shadows.card]}
          onPress={() =>
            router.push(`/(student)/od/pass/${request.id}` as Href)
          }
        >
          <Ionicons name="qr-code-outline" size={22} color={colors.white} />
          <Text style={styles.passButtonText}>View Digital OD Pass</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eventName: {
    ...typography.title,
    fontSize: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    gap: 4,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  docName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  emptyDocs: {
    ...typography.caption,
  },
  changeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  changeBannerText: { flex: 1, gap: 4 },
  changeBannerTitle: { fontWeight: '700', color: colors.warning, fontSize: 14 },
  changeBannerBody: { color: colors.text, fontSize: 13, lineHeight: 18 },
  actions: {
    gap: spacing.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  passButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
  },
  passButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.7 },
  errorTitle: {
    ...typography.heading,
    marginTop: spacing.sm,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
