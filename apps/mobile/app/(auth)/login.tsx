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
import { z } from 'zod';

import { getCollegeEmailDomain, getRoleHomeRoute } from '@/src/lib/auth';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '@/src/theme';
import { isCollegeEmail } from '@campusflow/shared';

const loginSchema = z.object({
  email: z
    .string()
    .email('Enter a valid email address')
    .refine((value) => isCollegeEmail(value, getCollegeEmailDomain()), {
      message: `Use your CIT college email (@${getCollegeEmailDomain()}).`,
    }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn, isProfileLoading, authError, clearError, user, profile } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (user && profile) {
      router.replace(getRoleHomeRoute(profile.role));
    }
  }, [user, profile]);

  const onSubmit = async (data: LoginForm) => {
    clearError();
    try {
      await signIn(data.email, data.password);
      const { profile: nextProfile } = useAuthStore.getState();
      if (nextProfile) {
        router.replace(getRoleHomeRoute(nextProfile.role));
      }
    } catch {
      // authError is set in store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, shadows.hero]}>
          <Text style={styles.heroLabel}>CampusFlow</Text>
          <Text style={styles.heroTitle}>Sign in to continue</Text>
          <Text style={styles.heroSubtitle}>
            Manage On-Duty requests, track approvals, and access your digital OD pass.
          </Text>
        </View>

        <View style={[styles.formCard, shadows.card]}>
          <Text style={styles.formTitle}>Welcome back</Text>

          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <Text style={styles.label}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="name.dept2024@citchennai.net"
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

          <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isProfileLoading}
              />
            )}
          />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

          <Pressable
            style={[styles.button, isProfileLoading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isProfileLoading}
          >
            {isProfileLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.helper}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.helperText}>
            Only @citchennai.net college emails can sign in. Contact your admin if you
            don&apos;t have an account.
          </Text>
        </View>

        {__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true' && (
          <View style={styles.devHint}>
            <Text style={styles.devHintTitle}>Dev / emulator login</Text>
            <Text style={styles.devHintText}>
              Password for all seed users: password123{'\n'}
              Example: sudharsanb1.cse2024@citchennai.net{'\n'}
              After restarting emulators, run npm run seed on your PC.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  formTitle: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
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
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  helper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  helperText: {
    flex: 1,
    ...typography.caption,
    lineHeight: 18,
  },
  devHint: {
    marginTop: spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  devHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  devHintText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
