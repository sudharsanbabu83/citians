import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';
import { submitODRequestInputSchema } from '@campusflow/shared';

import { useCreateDraft, useSubmitODRequest, useUpdateDraft } from '@/src/hooks/useODMutations';
import { resolveHodUserId } from '@/src/lib/odApi';
import {
  deleteODDocument,
  fetchRequestDocuments,
  pickODDocuments,
  uploadODDocument,
  type ODDocumentWithId,
} from '@/src/lib/odDocuments';
import { fetchODRequestById } from '@/src/lib/odRequests';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';

const odFormSchema = submitODRequestInputSchema
  .omit({ requestId: true, documentIds: true })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

type ODFormValues = z.infer<typeof odFormSchema>;

function mapCallableError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === 'functions/unauthenticated') return 'Please sign in again.';
  if (code === 'functions/permission-denied') return 'You are not allowed to submit this request.';
  if (code === 'functions/failed-precondition') return message || 'This request cannot be submitted.';
  if (code === 'functions/invalid-argument') return message || 'Please check your form fields.';
  if (code === 'functions/not-found') return 'Request not found.';
  return message || 'Something went wrong. Please try again.';
}

export default function ApplyODScreen() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((s) => s.user);
  const roleProfile = useAuthStore((s) => s.roleProfile);

  const [requestId, setRequestId] = useState<string | undefined>(editId);
  const [documents, setDocuments] = useState<ODDocumentWithId[]>([]);
  const [pendingFiles, setPendingFiles] = useState<{ name: string }[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const submitRequest = useSubmitODRequest();

  const isBusy =
    createDraft.isPending || updateDraft.isPending || submitRequest.isPending || isUploading;

  const { data: existingRequest, isLoading: loadingRequest } = useQuery({
    queryKey: ['odRequest', editId],
    queryFn: () => fetchODRequestById(editId!),
    enabled: !!editId,
  });

  const { data: existingDocs, isLoading: loadingDocs } = useQuery({
    queryKey: ['odDocuments', requestId],
    queryFn: () => fetchRequestDocuments(requestId!),
    enabled: !!requestId,
  });

  useEffect(() => {
    if (existingDocs) {
      setDocuments(existingDocs);
    }
  }, [existingDocs]);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ODFormValues>({
    resolver: zodResolver(odFormSchema),
    defaultValues: {
      eventName: '',
      purpose: '',
      organizer: '',
      location: '',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (existingRequest) {
      reset({
        eventName: existingRequest.eventName,
        purpose: existingRequest.purpose,
        organizer: existingRequest.organizer,
        location: existingRequest.location,
        startDate: existingRequest.startDate,
        endDate: existingRequest.endDate,
        reason: existingRequest.reason,
      });
      setRequestId(existingRequest.id);
    }
  }, [existingRequest, reset]);

  const studentDept =
    roleProfile?.type === 'STUDENT' ? roleProfile.data.departmentId : null;

  const ensureDraft = async (values: ODFormValues): Promise<string> => {
    if (!user?.uid || !studentDept) {
      throw new Error('Student profile not loaded.');
    }

    const hodUserId = await resolveHodUserId(studentDept);
    const draftFields = {
      eventName: values.eventName,
      purpose: values.purpose,
      organizer: values.organizer,
      location: values.location,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason,
    };

    if (requestId) {
      let currentStatus = existingRequest?.status;
      if (!currentStatus) {
        const snap = await fetchODRequestById(requestId);
        if (!snap) {
          throw new Error('Draft not found. Save the form and try again.');
        }
        currentStatus = snap.status;
      }
      await updateDraft.mutateAsync({
        requestId,
        input: draftFields,
        currentStatus,
      });
      return requestId;
    }

    const newId = await createDraft.mutateAsync({
      studentUserId: user.uid,
      departmentId: studentDept,
      hodUserId,
      ...draftFields,
    });
    setRequestId(newId);
    return newId;
  };

  const onSaveDraft = handleSubmit(async (values) => {
    setActionError(null);
    try {
      await ensureDraft(values);
      Alert.alert('Draft saved', 'Your OD request has been saved as a draft.');
    } catch (err) {
      setActionError((err as Error).message);
    }
  });

  const onPickDocuments = async () => {
    setActionError(null);
    try {
      const totalCount = documents.length + pendingFiles.length;
      const picked = await pickODDocuments(totalCount);
      if (picked.length === 0) return;

      setPendingFiles((prev) => [...prev, ...picked.map((f) => ({ name: f.name }))]);

      let activeRequestId = requestId;
      if (!activeRequestId) {
        const values = getValues();
        const parsed = odFormSchema.safeParse(values);
        if (!parsed.success) {
          setPendingFiles((prev) => prev.slice(0, prev.length - picked.length));
          setActionError('Fill in all required fields before uploading documents.');
          return;
        }
        activeRequestId = await ensureDraft(parsed.data);
      }

      setIsUploading(true);
      for (const file of picked) {
        await uploadODDocument(activeRequestId, file);
      }
      const updated = await fetchRequestDocuments(activeRequestId);
      setDocuments(updated);
      setPendingFiles([]);
    } catch (err) {
      setActionError((err as Error).message);
      setPendingFiles([]);
    } finally {
      setIsUploading(false);
    }
  };

  const onRemoveDocument = async (doc: ODDocumentWithId) => {
    if (!requestId) return;
    Alert.alert('Remove file', `Remove ${doc.fileName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteODDocument(requestId, doc.id, doc.storagePath);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          } catch (err) {
            setActionError((err as Error).message);
          }
        },
      },
    ]);
  };

  const onSubmit = handleSubmit(async (values) => {
    setActionError(null);
    try {
      const activeRequestId = await ensureDraft(values);
      const docIds = documents.map((d) => d.id);

      await submitRequest.mutateAsync({
        requestId: activeRequestId,
        ...values,
        documentIds: docIds.length > 0 ? docIds : undefined,
      });

      Alert.alert('Submitted', 'Your OD request has been sent to your HOD for review.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setActionError(mapCallableError(err));
    }
  });

  if (editId && (loadingRequest || loadingDocs)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (
    editId &&
    existingRequest &&
    !['DRAFT', 'CHANGES_REQUESTED'].includes(existingRequest.status)
  ) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text style={styles.blockedTitle}>Cannot edit this request</Text>
        <Text style={styles.blockedCaption}>
          Only draft or changes-requested requests can be edited.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isEdit = !!editId;
  const showChangeBanner = existingRequest?.status === 'CHANGES_REQUESTED';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showChangeBanner && existingRequest?.changeComment ? (
          <View style={styles.changeBanner}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.warning} />
            <View style={styles.changeBannerText}>
              <Text style={styles.changeBannerTitle}>HOD requested changes</Text>
              <Text style={styles.changeBannerBody}>{existingRequest.changeComment}</Text>
            </View>
          </View>
        ) : null}

        {actionError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>{isEdit ? 'Edit OD request' : 'New OD request'}</Text>
          <Text style={styles.sectionHint}>
            Fill in event details. Save as draft anytime, then submit when ready.
          </Text>

          <FormField label="Event name" error={errors.eventName?.message}>
            <Controller
              control={control}
              name="eventName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.eventName && styles.inputError]}
                  placeholder="e.g. Smart India Hackathon"
                  placeholderTextColor={colors.textMuted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isBusy}
                />
              )}
            />
          </FormField>

          <FormField label="Purpose" error={errors.purpose?.message}>
            <Controller
              control={control}
              name="purpose"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.purpose && styles.inputError]}
                  placeholder="Why are you attending?"
                  placeholderTextColor={colors.textMuted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isBusy}
                />
              )}
            />
          </FormField>

          <FormField label="Organizer" error={errors.organizer?.message}>
            <Controller
              control={control}
              name="organizer"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.organizer && styles.inputError]}
                  placeholder="Organizing body"
                  placeholderTextColor={colors.textMuted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isBusy}
                />
              )}
            />
          </FormField>

          <FormField label="Location" error={errors.location?.message}>
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.location && styles.inputError]}
                  placeholder="City or venue"
                  placeholderTextColor={colors.textMuted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isBusy}
                />
              )}
            />
          </FormField>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormField label="Start date" error={errors.startDate?.message} hint="YYYY-MM-DD">
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.startDate && styles.inputError]}
                      placeholder="2026-04-01"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isBusy}
                    />
                  )}
                />
              </FormField>
            </View>
            <View style={styles.halfField}>
              <FormField label="End date" error={errors.endDate?.message} hint="YYYY-MM-DD">
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.endDate && styles.inputError]}
                      placeholder="2026-04-03"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isBusy}
                    />
                  )}
                />
              </FormField>
            </View>
          </View>

          <FormField label="Reason" error={errors.reason?.message}>
            <Controller
              control={control}
              name="reason"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.textArea, errors.reason && styles.inputError]}
                  placeholder="Explain why OD is needed"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isBusy}
                />
              )}
            />
          </FormField>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>Proof documents</Text>
          <Text style={styles.sectionHint}>
            PDF, PNG, or JPEG — max 5 files, 10 MB each. Optional but recommended.
          </Text>

          {documents.map((doc) => (
            <View key={doc.id} style={styles.fileRow}>
              <Ionicons name="document-outline" size={20} color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                {doc.fileName}
              </Text>
              <Pressable onPress={() => onRemoveDocument(doc)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={colors.error} />
              </Pressable>
            </View>
          ))}

          {pendingFiles.map((file, index) => (
            <View key={`pending-${index}`} style={styles.fileRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                Uploading {file.name}…
              </Text>
            </View>
          ))}

          <Pressable
            style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
            onPress={onPickDocuments}
            disabled={isBusy || documents.length >= 5}
          >
            <Ionicons name="attach-outline" size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Add document</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.secondaryButton, styles.saveButton, isBusy && styles.buttonDisabled]}
          onPress={onSaveDraft}
          disabled={isBusy}
        >
          {createDraft.isPending || updateDraft.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Save as Draft</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={isBusy}
        >
          {submitRequest.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Submit for Review</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {hint ? <Text style={styles.labelHint}> ({hint})</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { ...typography.heading },
  sectionHint: { ...typography.caption, lineHeight: 18 },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  labelHint: { fontWeight: '400', color: colors.textMuted },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  textArea: { minHeight: 100, paddingTop: 12 },
  fieldError: { color: colors.error, fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfField: { flex: 1 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fileName: { flex: 1, fontSize: 14, color: colors.text },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  saveButton: { backgroundColor: colors.surface },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 13, lineHeight: 18 },
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
  blockedTitle: { ...typography.heading, marginTop: spacing.sm },
  blockedCaption: { ...typography.caption, textAlign: 'center' },
  linkText: { color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
});
