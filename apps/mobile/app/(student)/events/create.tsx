import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';import { z } from 'zod';
import { EVENT_APPROVAL_MODES, EVENT_TYPES } from '@campusflow/shared';

import { useEventMutations } from '@/src/hooks/useEvents';
import { DatePickerField, TimePickerField } from '@/src/components/DateTimePickerField';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useAuthStore } from '@/src/lib/authStore';
import { uploadEventPoster, type PickedEventPoster } from '@/src/lib/eventPosters';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

function mapCallableError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === 'functions/unauthenticated') return 'Please sign in again.';
  if (code === 'functions/permission-denied') return 'You are not allowed to create events.';
  if (code === 'functions/failed-precondition') return message || 'This event cannot be created.';
  if (code === 'functions/invalid-argument') return message || 'Please check your form fields.';
  if (code === 'functions/internal') return 'Server error. If this persists, contact support.';
  return message || 'Something went wrong. Please try again.';
}

const formSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Add a short description'),
  type: z.enum(EVENT_TYPES),
  venue: z.string().min(1, 'Venue is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  registrationDeadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  registrationDeadlineTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  maxParticipants: z.string().optional(),
  collegeWide: z.boolean(),
  approvalMode: z.enum(EVENT_APPROVAL_MODES),
});

type FormValues = z.infer<typeof formSchema>;

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function CreateEventScreen() {
  const params = useLocalSearchParams<{ source?: string; title?: string; description?: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const roleProfile = useAuthStore((s) => s.roleProfile);
  const studentDept =
    roleProfile?.type === 'STUDENT' ? roleProfile.data.departmentId : null;
  const { create } = useEventMutations();
  const bottomPadding = useBottomContentPadding();
  const insets = useSafeAreaInsets();
  const [poster, setPoster] = useState<PickedEventPoster | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: params.title ?? '',
      description: params.description ?? '',
      type: params.source === 'doubt' ? 'WORKSHOP' : 'HACKATHON',
      venue: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '17:00',
      registrationDeadlineDate: '',
      registrationDeadlineTime: '23:59',
      maxParticipants: '',
      collegeWide: true,
      approvalMode: 'MANUAL',
    },
  });

  const selectedType = watch('type');
  const collegeWide = watch('collegeWide');
  const approvalMode = watch('approvalMode');
  const startDate = watch('startDate');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endMinimumDate = startDate ? new Date(`${startDate}T00:00:00`) : today;

  const onSubmit = async (values: FormValues) => {
    if (!collegeWide && !studentDept) {
      Alert.alert('Department missing', 'Your student profile has no department assigned.');
      return;
    }

    try {
      setIsPublishing(true);
      const posterUrl = poster ? await uploadEventPoster(poster) : undefined;
      const result = await create.mutateAsync({
        title: values.title,
        description: values.description,
        ...(posterUrl ? { posterUrl } : {}),
        type: values.type,
        venue: values.venue,
        startAt: combineDateTime(values.startDate, values.startTime),
        endAt: combineDateTime(values.endDate, values.endTime),
        registrationDeadline: combineDateTime(
          values.registrationDeadlineDate,
          values.registrationDeadlineTime
        ),
        maxParticipants: values.maxParticipants ? Number(values.maxParticipants) : null,
        departmentId: values.collegeWide ? null : studentDept,
        approvalMode: values.approvalMode,
      });
      Alert.alert('Submitted for review', 'An admin will verify your event before it becomes available to students.');
      router.replace(`/(student)/events/${result.eventId}` as Href);
    } catch (error) {
      Alert.alert('Could not create event', mapCallableError(error));
    } finally {
      setIsPublishing(false);
    }
  };

  const choosePoster = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if ((asset.size ?? 0) > 8 * 1024 * 1024) {
      Alert.alert('Poster too large', 'Choose an image smaller than 8 MB.');
      return;
    }
    setPoster({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
      size: asset.size ?? 0,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 64}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      {params.source === 'doubt' ? (
        <View style={styles.doubtSource}>
          <Ionicons name="git-branch" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.doubtSourceTitle}>Born from a campus doubt</Text>
            <Text style={styles.doubtSourceText}>The title and context are ready. Add a time and place to turn student demand into a live learning room.</Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.intro}>
        Host a hackathon, workshop, or campus event for students to discover and register.
      </Text>

      <FormField label="Title" error={errors.title?.message}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="Smart India Hackathon 2026"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="What is this event about?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
            />
          )}
        />
      </FormField>

      <View style={styles.posterHeader}>
        <View style={styles.posterLabelWrap}>
          <Text style={styles.label}>Event poster</Text>
          <Text style={styles.posterHint}>Optional · PNG or JPEG · max 8 MB</Text>
        </View>
        {poster ? (
          <Pressable onPress={() => setPoster(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove event poster">
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <Pressable style={styles.posterPicker} onPress={choosePoster} disabled={isPublishing}>
        {poster ? (
          <Image source={{ uri: poster.uri }} style={styles.posterPreview} resizeMode="cover" />
        ) : (
          <>
            <View style={styles.posterIcon}><Ionicons name="image-outline" size={28} color={colors.primary} /></View>
            <Text style={styles.posterTitle}>Add a poster</Text>
            <Text style={styles.posterCaption}>Help students recognize your event at a glance</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        {EVENT_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.typeChip, selectedType === type && styles.typeChipActive]}
            onPress={() => setValue('type', type)}
          >
            <Text style={[styles.typeChipText, selectedType === type && styles.typeChipTextActive]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Registration approval</Text>
      <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeChip, approvalMode === 'AUTO' && styles.typeChipActive]}
          onPress={() => setValue('approvalMode', 'AUTO', { shouldDirty: true, shouldValidate: true })}
        >
          <Text style={[styles.typeChipText, approvalMode === 'AUTO' && styles.typeChipTextActive]}>
            Auto approve
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeChip, approvalMode === 'MANUAL' && styles.typeChipActive]}
          onPress={() => setValue('approvalMode', 'MANUAL', { shouldDirty: true, shouldValidate: true })}
        >
          <Text style={[styles.typeChipText, approvalMode === 'MANUAL' && styles.typeChipTextActive]}>
            Organizer approval
          </Text>
        </Pressable>
      </View>
      <Text style={styles.helperText}>
        {approvalMode === 'AUTO'
          ? 'Students receive their QR ticket as soon as they register.'
          : 'Students stay pending until you approve them from the attendee list.'}
      </Text>

      <FormField label="Venue" error={errors.venue?.message}>
        <Controller
          control={control}
          name="venue"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.venue && styles.inputError]}
              placeholder="Main auditorium"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
      </FormField>

      <Text style={styles.label}>Audience</Text>
      <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeChip, collegeWide && styles.typeChipActive]}
          onPress={() => setValue('collegeWide', true)}
        >
          <Text style={[styles.typeChipText, collegeWide && styles.typeChipTextActive]}>
            College-wide
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeChip, !collegeWide && styles.typeChipActive]}
          onPress={() => setValue('collegeWide', false)}
        >
          <Text style={[styles.typeChipText, !collegeWide && styles.typeChipTextActive]}>
            My department
          </Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <FormField label="Start date" error={errors.startDate?.message}>
            <Controller
              control={control}
              name="startDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <DatePickerField
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  hasError={Boolean(errors.startDate)}
                  minimumDate={today}
                />
              )}
            />
          </FormField>
        </View>
        <View style={styles.half}>
          <FormField label="Start time" error={errors.startTime?.message}>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, onBlur, value } }) => (
                <TimePickerField
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  hasError={Boolean(errors.startTime)}
                />
              )}
            />
          </FormField>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <FormField label="End date" error={errors.endDate?.message}>
            <Controller
              control={control}
              name="endDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <DatePickerField
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  hasError={Boolean(errors.endDate)}
                  minimumDate={endMinimumDate}
                />
              )}
            />
          </FormField>
        </View>
        <View style={styles.half}>
          <FormField label="End time" error={errors.endTime?.message}>
            <Controller
              control={control}
              name="endTime"
              render={({ field: { onChange, onBlur, value } }) => (
                <TimePickerField
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  hasError={Boolean(errors.endTime)}
                />
              )}
            />
          </FormField>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <FormField label="Registration deadline date" error={errors.registrationDeadlineDate?.message}>
            <Controller
              control={control}
              name="registrationDeadlineDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <DatePickerField
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  hasError={Boolean(errors.registrationDeadlineDate)}
                  minimumDate={today}
                  maximumDate={startDate ? new Date(`${startDate}T23:59:59`) : undefined}
                />
              )}
            />
          </FormField>
        </View>
        <View style={styles.half}>
          <FormField label="Deadline time" error={errors.registrationDeadlineTime?.message}>
            <Controller
              control={control}
              name="registrationDeadlineTime"
              render={({ field: { onChange, onBlur, value } }) => (
                <TimePickerField
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  hasError={Boolean(errors.registrationDeadlineTime)}
                />
              )}
            />
          </FormField>
        </View>
      </View>

      <FormField label="Max participants (optional)" error={errors.maxParticipants?.message}>
        <Controller
          control={control}
          name="maxParticipants"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="Leave empty for unlimited"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="number-pad"
            />
          )}
        />
      </FormField>

      <Pressable
        style={[styles.submitButton, styles.cardShadow, create.isPending && styles.submitDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={create.isPending || isPublishing}
      >
        {create.isPending || isPublishing ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitText}>Publish event</Text>
        )}
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadow: theme.shadows.card,
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  doubtSource: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: theme.colors.accentBg, borderWidth: 1, borderColor: theme.colors.accentBorder, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  doubtSourceTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  doubtSourceText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  intro: { ...theme.typography.caption, marginBottom: spacing.sm },
  field: { gap: spacing.xs },
  label: { ...theme.typography.label },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fontFamilies.body,
    color: theme.colors.text,
  },
  inputError: { borderColor: theme.colors.error },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: theme.colors.error, fontSize: 12 },
  helperText: { ...theme.typography.caption, marginBottom: spacing.sm },
  posterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  posterLabelWrap: { flex: 1, gap: 2 },
  posterHint: { ...theme.typography.caption },
  posterPicker: { minHeight: 150, borderRadius: borderRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  posterIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  posterTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  posterCaption: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  posterPreview: { width: '100%', height: 190 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  typeChipTextActive: { color: theme.colors.white },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  submitButton: {
    marginTop: spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: theme.colors.white, fontSize: 16, fontFamily: fontFamilies.bold },
});
