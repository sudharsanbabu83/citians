import { zodResolver } from '@hookform/resolvers/zod';
import { router, type Href } from 'expo-router';
import type React from 'react';
import { Controller, useForm } from 'react-hook-form';
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

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';import { z } from 'zod';
import { COMPETITION_MODES, COMPETITION_PLATFORMS } from '@campusflow/shared';

import {
  ControlledDatePickerField,
  ControlledTimePickerField,
} from '@/src/components/DateTimePickerField';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useCompetitionMutations } from '@/src/hooks/useCompetitions';
import { useAuthStore } from '@/src/lib/authStore';
import { formatPlatformLabel } from '@/src/lib/competitions';
import { borderRadius, spacing } from '@/src/theme';

function mapCallableError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const message = (error as Error).message;
  if (code === 'functions/unauthenticated') return 'Please sign in again.';
  if (code === 'functions/permission-denied') return 'You are not allowed to add competitions.';
  if (code === 'functions/invalid-argument') return message || 'Please check your form fields.';
  return message || 'Something went wrong. Please try again.';
}

const formSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Add a short description'),
  platform: z.enum(COMPETITION_PLATFORMS),
  platformLabel: z.string().optional(),
  registrationUrl: z.string().url('Enter a valid registration URL'),
  mode: z.enum(COMPETITION_MODES),
  venue: z.string().optional(),
  prizePool: z.string().optional(),
  teamSize: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  registrationDeadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  registrationDeadlineTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
});

type FormValues = z.infer<typeof formSchema>;

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function CreateCompetitionScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const { create } = useCompetitionMutations(user?.uid);
  const bottomPadding = useBottomContentPadding();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      platform: 'DEVPOST',
      platformLabel: '',
      registrationUrl: '',
      mode: 'ONLINE',
      venue: '',
      prizePool: '',
      teamSize: '2-4 members',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '18:00',
      registrationDeadlineDate: '',
      registrationDeadlineTime: '23:59',
    },
  });

  const selectedPlatform = watch('platform');
  const selectedMode = watch('mode');
  const startDate = watch('startDate');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endMinimumDate = startDate ? new Date(`${startDate}T00:00:00`) : today;

  const publish = async (values: FormValues, asDraft: boolean) => {
    try {
      const result = await create.mutateAsync({
        title: values.title,
        description: values.description,
        platform: values.platform,
        platformLabel: values.platform === 'OTHER' ? values.platformLabel : undefined,
        registrationUrl: values.registrationUrl,
        mode: values.mode,
        venue: values.mode === 'ONLINE' ? undefined : values.venue,
        prizePool: values.prizePool || undefined,
        teamSize: values.teamSize || undefined,
        startAt: combineDateTime(values.startDate, values.startTime),
        endAt: combineDateTime(values.endDate, values.endTime),
        registrationDeadline: combineDateTime(
          values.registrationDeadlineDate,
          values.registrationDeadlineTime
        ),
        publish: !asDraft,
      });
      Alert.alert(
        asDraft ? 'Draft saved' : 'Published',
        asDraft
          ? 'Competition saved as draft.'
          : 'Students can now see this competition on their dashboard.'
      );
      router.replace(`/(competitions-admin)/competitions/${result.competitionId}` as Href);
    } catch (error) {
      Alert.alert('Could not save competition', mapCallableError(error));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.intro}>
        Add an upcoming hackathon from Devpost, HackerEarth, Unstop, or any other platform.
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
              placeholder="What is this hackathon about?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
            />
          )}
        />
      </FormField>

      <Text style={styles.label}>Platform</Text>
      <View style={styles.chipWrap}>
        {COMPETITION_PLATFORMS.map((platform) => (
          <Pressable
            key={platform}
            style={[styles.chip, selectedPlatform === platform && styles.chipActive]}
            onPress={() => setValue('platform', platform)}
          >
            <Text style={[styles.chipText, selectedPlatform === platform && styles.chipTextActive]}>
              {formatPlatformLabel(platform)}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedPlatform === 'OTHER' ? (
        <FormField label="Platform name" error={errors.platformLabel?.message}>
          <Controller
            control={control}
            name="platformLabel"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="e.g. MLH, DoraHacks"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        </FormField>
      ) : null}

      <FormField label="Registration URL" error={errors.registrationUrl?.message}>
        <Controller
          control={control}
          name="registrationUrl"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.registrationUrl && styles.inputError]}
              placeholder="https://devpost.com/..."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="url"
            />
          )}
        />
      </FormField>

      <Text style={styles.label}>Mode</Text>
      <View style={styles.chipWrap}>
        {COMPETITION_MODES.map((mode) => (
          <Pressable
            key={mode}
            style={[styles.chip, selectedMode === mode && styles.chipActive]}
            onPress={() => setValue('mode', mode)}
          >
            <Text style={[styles.chipText, selectedMode === mode && styles.chipTextActive]}>
              {mode}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedMode !== 'ONLINE' ? (
        <FormField label="Venue" error={errors.venue?.message}>
          <Controller
            control={control}
            name="venue"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Chennai / Campus auditorium"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        </FormField>
      ) : null}

      <FormField label="Prize pool (optional)">
        <Controller
          control={control}
          name="prizePool"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="₹5,00,000 + internships"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
      </FormField>

      <FormField label="Team size (optional)">
        <Controller
          control={control}
          name="teamSize"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="2-4 members"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
      </FormField>

      <Text style={styles.sectionTitle}>Schedule</Text>
      <ControlledDatePickerField control={control} name="startDate" label="Start date" minimumDate={today} />
      <ControlledTimePickerField control={control} name="startTime" label="Start time" />
      <ControlledDatePickerField
        control={control}
        name="endDate"
        label="End date"
        minimumDate={endMinimumDate}
      />
      <ControlledTimePickerField control={control} name="endTime" label="End time" />
      <ControlledDatePickerField
        control={control}
        name="registrationDeadlineDate"
        label="Registration deadline date"
        minimumDate={today}
      />
      <ControlledTimePickerField
        control={control}
        name="registrationDeadlineTime"
        label="Registration deadline time"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryButton, create.isPending && styles.buttonDisabled]}
          onPress={handleSubmit((values) => publish(values, true))}
          disabled={create.isPending}
        >
          {create.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Save draft</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.primaryButton, create.isPending && styles.buttonDisabled]}
          onPress={handleSubmit((values) => publish(values, false))}
          disabled={create.isPending}
        >
          {create.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Publish for students</Text>
          )}
        </Pressable>
      </View>
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md },
  intro: { ...theme.typography.caption, marginBottom: spacing.md, lineHeight: 20 },
  field: { marginBottom: spacing.md },
  label: { ...theme.typography.label, marginBottom: spacing.xs },
  sectionTitle: { ...theme.typography.heading, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputError: { borderColor: theme.colors.error },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  errorText: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  chipTextActive: { color: theme.colors.white },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', fontSize: 16 },
  secondaryButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },
  buttonDisabled: { opacity: 0.7 },
});
