import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
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
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  isCollegeEmail,
} from '@campusflow/shared';

import { getCollegeEmailDomain, getRoleHomeRoute, SETUP_PROFILE_ROUTE } from '@/src/lib/auth';
import { AppLogo } from '@/src/components/AppLogo';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useAuthStore } from '@/src/lib/authStore';
import { db } from '@/src/config/firebase';
import { borderRadius, spacing } from '@/src/theme';

const YEARS = ['1', '2', '3', '4'];
const registerSchema = z
  .object({
    email: z
      .string()
      .email('Enter a valid email address')
      .refine((value) => isCollegeEmail(value, getCollegeEmailDomain()), {
        message: `Only @${getCollegeEmailDomain()} college emails are allowed.`,
      }),
    username: z
      .string()
      .min(USERNAME_MIN_LENGTH, `At least ${USERNAME_MIN_LENGTH} characters`)
      .max(USERNAME_MAX_LENGTH, `At most ${USERNAME_MAX_LENGTH} characters`)
      .regex(USERNAME_PATTERN, 'Use letters, numbers, and underscores only'),
    phone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,17}$/, 'Enter a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
    registerNumber: z.string().min(1, 'Register number is required').max(40),
    departmentId: z.string().trim().min(1, 'Department is required'),
    year: z.string().min(1, 'Select your year'),
    section: z.string().trim().min(1, 'Section is required').max(20),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { register: registerAccount, isProfileLoading, authError, clearError, user, profile, needsProfileSetup } =
    useAuthStore();
  const bottomPadding = useBottomContentPadding();
  const responsive = useResponsiveLayout();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      phone: '',
      password: '',
      confirmPassword: '',
      registerNumber: '',
      departmentId: '',
      year: '3',
      section: '',
    },
  });

  const selectedYear = watch('year');

  useEffect(() => {
    if (user && profile) {
      if (needsProfileSetup) {
        router.replace(SETUP_PROFILE_ROUTE);
        return;
      }
      router.replace(getRoleHomeRoute(profile.role));
    }
  }, [user, profile, needsProfileSetup]);

  const onSubmit = async (data: RegisterForm) => {
    clearError();
    try {
      await registerAccount({
        email: data.email.trim().toLowerCase(),
        username: data.username.trim(),
        phone: data.phone.trim(),
        password: data.password,
        registerNumber: data.registerNumber.trim(),
        departmentId: data.departmentId || 'unassigned',
        year: data.year,
        section: data.section,
      });
      const { profile: nextProfile, needsProfileSetup: pendingProfile } = useAuthStore.getState();
      if (nextProfile) {
        if (pendingProfile) {
          router.replace(SETUP_PROFILE_ROUTE);
        } else {
          router.replace(getRoleHomeRoute(nextProfile.role));
        }
      }
    } catch {
      // authError is set in store
    }
  };

  const collegeDomain = getCollegeEmailDomain();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, responsive.formContentStyle, { paddingBottom: bottomPadding, paddingHorizontal: responsive.gutter }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, styles.heroShadow]}>
          <View style={styles.heroBrand}>
            <AppLogo size={64} />
            <View style={styles.heroText}>
              <Text style={styles.heroLabel}>Citians</Text>
              <Text style={styles.heroTitle}>Create your account</Text>
            </View>
          </View>
          <Text style={styles.heroSubtitle}>
            Use your @{collegeDomain} email only. Pick a username to stay anonymous on the Build
            Board and campus feed.
          </Text>
        </View>

        <View style={[styles.formCard, styles.cardShadow]}>
          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <Text style={styles.label}>College email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder={`name.dept2024@${collegeDomain}`}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

          <Text style={[styles.label, { marginTop: spacing.md }]}>Username</Text>
          <Text style={styles.hint}>Shown publicly — can be anything you like</Text>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="e.g. nightcoder_42"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
                maxLength={USERNAME_MAX_LENGTH}
              />
            )}
          />
          {errors.username && <Text style={styles.fieldError}>{errors.username.message}</Text>}

          <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

          <Text style={[styles.label, { marginTop: spacing.md }]}>Confirm password</Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.confirmPassword && (
            <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
          )}

          <Text style={[styles.label, { marginTop: spacing.md }]}>Phone number</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="e.g. +91 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.phone && <Text style={styles.fieldError}>{errors.phone.message}</Text>}

          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Student details</Text>

          <Text style={styles.label}>Register number</Text>
          <Controller
            control={control}
            name="registerNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.registerNumber && styles.inputError]}
                placeholder="e.g. 21CSE001"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.registerNumber && (
            <Text style={styles.fieldError}>{errors.registerNumber.message}</Text>
          )}

          <Text style={[styles.label, { marginTop: spacing.md }]}>Department</Text>
          <Controller
            control={control}
            name="departmentId"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.departmentId && styles.inputError]}
                placeholder="e.g. Computer Science and Engineering or CSE"
                placeholderTextColor={colors.textMuted}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.departmentId && <Text style={styles.fieldError}>{errors.departmentId.message}</Text>}

          <Text style={[styles.label, { marginTop: spacing.md }]}>Year</Text>
          <View style={styles.chipRow}>
            {YEARS.map((year) => {
              const active = selectedYear === year;
              return (
                <Pressable
                  key={year}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setValue('year', year, { shouldValidate: true })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>Year {year}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Section</Text>
          <Controller
            control={control}
            name="section"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.section && styles.inputError]}
                placeholder="e.g. A"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.section && <Text style={styles.fieldError}>{errors.section.message}</Text>}

          <Pressable
            style={[styles.button, isProfileLoading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isProfileLoading}
          >
            {isProfileLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    heroShadow: theme.shadows.hero,
    cardShadow: theme.shadows.card,
  flex: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flexGrow: 1,
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroText: { flex: 1 },
  heroLabel: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.heading,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputError: { borderColor: theme.colors.error },
  fieldError: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  chipScroll: { marginBottom: spacing.xs },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  loader: { marginVertical: spacing.sm },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
