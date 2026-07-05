import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@campusflow/shared';

import { ODStatusBadge } from '@/src/components/ODStatusBadge';
import {
  useApproveODRequest,
  useRejectODRequest,
  useRequestODChanges,
  mapHodReviewError,
} from '@/src/hooks/useHodReviewMutations';
import { db } from '@/src/config/firebase';
import { fetchRequestDocuments } from '@/src/lib/odDocuments';
import {
  fetchODRequestById,
  formatDateRange,
  formatRequestDate,
} from '@/src/lib/odRequests';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

type ActionModal = 'reject' | 'changes' | null;

export default function HodReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const departmentId =
    roleProfile?.type === 'HOD' ? roleProfile.data.departmentId : undefined;

  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [comment, setComment] = useState('');
  const [approveComment, setApproveComment] = useState('');

  const approveMutation = useApproveODRequest(departmentId);
  const rejectMutation = useRejectODRequest(departmentId);
  const changesMutation = useRequestODChanges(departmentId);

  const isBusy =
    approveMutation.isPending || rejectMutation.isPending || changesMutation.isPending;

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

  const { data: studentName } = useQuery({
    queryKey: ['userName', request?.studentUserId],
    queryFn: async () => {
      if (request?.studentName) return request.studentName;
      const snap = await getDoc(doc(db, COLLECTIONS.USERS, request!.studentUserId));
      return snap.exists() ? (snap.data().name as string) : 'Student';
    },
    enabled: !!request?.studentUserId && !request?.studentName,
  });

  const displayStudentName = request?.studentName ?? studentName;

  const canReview = request?.status === 'PENDING_HOD_REVIEW';

  const onApprove = () => {
    if (!id) return;
    Alert.alert('Approve request', 'Approve this OD request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await approveMutation.mutateAsync({
              requestId: id,
              comment: approveComment.trim() || undefined,
            });
            Alert.alert('Approved', 'The OD request has been approved.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (err) {
            Alert.alert('Error', mapHodReviewError(err));
          }
        },
      },
    ]);
  };

  const onConfirmReject = async () => {
    if (!id || !comment.trim()) return;
    try {
      await rejectMutation.mutateAsync({
        requestId: id,
        rejectionReason: comment.trim(),
      });
      setActionModal(null);
      setComment('');
      Alert.alert('Rejected', 'The student has been notified of the rejection.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', mapHodReviewError(err));
    }
  };

  const onConfirmChanges = async () => {
    if (!id || !comment.trim()) return;
    try {
      await changesMutation.mutateAsync({
        requestId: id,
        changeComment: comment.trim(),
      });
      setActionModal(null);
      setComment('');
      Alert.alert('Changes requested', 'The student can edit and resubmit.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', mapHodReviewError(err));
    }
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
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, shadows.card]}>
          <Text style={styles.eventName}>{request.eventName}</Text>
          <ODStatusBadge status={request.status} />
          {displayStudentName ? (
            <Text style={styles.studentName}>Student: {displayStudentName}</Text>
          ) : null}
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
            documents.map((docItem) => (
              <View key={docItem.id} style={styles.docRow}>
                <Ionicons name="document-outline" size={18} color={colors.primary} />
                <Text style={styles.docName} numberOfLines={1}>
                  {docItem.fileName}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyDocs}>No documents attached</Text>
          )}
        </View>

        <View style={[styles.card, shadows.card]}>
          <DetailRow label="Submitted" value={formatRequestDate(request.submittedAt)} />
        </View>

        {canReview ? (
          <View style={styles.actions}>
            <Text style={styles.label}>Approval comment (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Add a note for the student"
              placeholderTextColor={colors.textMuted}
              value={approveComment}
              onChangeText={setApproveComment}
              editable={!isBusy}
            />

            <Pressable
              style={[styles.approveButton, isBusy && styles.buttonDisabled]}
              onPress={onApprove}
              disabled={isBusy}
            >
              {approveMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.changesButton, isBusy && styles.buttonDisabled]}
              onPress={() => {
                setComment('');
                setActionModal('changes');
              }}
              disabled={isBusy}
            >
              <Ionicons name="create-outline" size={20} color={colors.warning} />
              <Text style={styles.changesButtonText}>Request Changes</Text>
            </Pressable>

            <Pressable
              style={[styles.rejectButton, isBusy && styles.buttonDisabled]}
              onPress={() => {
                setComment('');
                setActionModal('reject');
              }}
              disabled={isBusy}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.infoCard, shadows.card]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              This request has already been reviewed (status: {request.status.replace(/_/g, ' ')}).
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={actionModal !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {actionModal === 'reject' ? 'Reject request' : 'Request changes'}
            </Text>
            <Text style={styles.modalHint}>
              {actionModal === 'reject'
                ? 'Provide a reason the student will see.'
                : 'Tell the student what to fix or upload.'}
            </Text>
            <TextInput
              style={[styles.input, styles.modalInput]}
              placeholder={
                actionModal === 'reject' ? 'Rejection reason' : 'Change request comment'
              }
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
              editable={!isBusy}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setActionModal(null)}
                disabled={isBusy}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  actionModal === 'reject' ? styles.rejectConfirm : styles.changesConfirm,
                  (!comment.trim() || isBusy) && styles.buttonDisabled,
                ]}
                onPress={actionModal === 'reject' ? onConfirmReject : onConfirmChanges}
                disabled={!comment.trim() || isBusy}
              >
                {rejectMutation.isPending || changesMutation.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eventName: { ...typography.title, fontSize: 20 },
  studentName: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: { gap: 4 },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: { fontSize: 15, color: colors.text, lineHeight: 22 },
  sectionTitle: { ...typography.heading, fontSize: 16 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docName: { flex: 1, fontSize: 14, color: colors.text },
  emptyDocs: { ...typography.caption },
  actions: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    marginTop: spacing.xs,
  },
  approveButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  changesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  changesButtonText: { color: colors.warning, fontSize: 16, fontWeight: '700' },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.error,
  },
  rejectButtonText: { color: colors.error, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },
  errorTitle: { ...typography.heading, marginTop: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.heading, fontSize: 18 },
  modalHint: { ...typography.caption, lineHeight: 18 },
  modalInput: { minHeight: 100, marginVertical: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { color: colors.text, fontWeight: '600' },
  rejectConfirm: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error,
  },
  changesConfirm: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning,
  },
  modalConfirmText: { color: colors.white, fontWeight: '700' },
});
