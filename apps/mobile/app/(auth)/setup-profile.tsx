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
} from '@campusflow/shared';

import { getRoleHomeRoute } from '@/src/lib/auth';
import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useAuthStore } from '@/src/lib/authStore';
import { borderRadius, spacing } from '@/src/theme';

const usernameSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH, `At least ${USERNAME_MIN_LENGTH} characters`)
    .max(USERNAME_MAX_LENGTH, `At most ${USERNAME_MAX_LENGTH} characters`)
    .regex(USERNAME_PATTERN, 'Use letters, numbers, and underscores only'),
});

type UsernameForm = z.infer<typeof usernameSchema>;

export default function SetupProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    user,
    profile,
    needsProfileSetup,
    setupUsername,
    isProfileLoading,
    authError,
    clearError,
    signOut,
  } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });
  const bottomPadding = useBottomContentPadding();
  const responsive = useResponsiveLayout();

  useEffect(() => {
    if (!user || !profile) {
      router.replace('/login');
      return;
    }

    if (!needsProfileSetup) {
      router.replace(getRoleHomeRoute(profile.role));
    }
  }, [user, profile, needsProfileSetup]);

  const onSubmit = async (data: UsernameForm) => {
    clearError();
    try {
      await setupUsername(data.username.trim());
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, responsive.formContentStyle, { paddingBottom: bottomPadding, paddingHorizontal: responsive.gutter }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, styles.heroShadow]}>
          <Ionicons name="person-circle-outline" size={40} color={colors.secondary} />
          <Text style={styles.heroTitle}>Choose your username</Text>
          <Text style={styles.heroSubtitle}>
            This is how you appear in campus spaces. Choose something easy for classmates to recognize.
          </Text>
        </View>

        <View style={[styles.formCard, styles.cardShadow]}>
          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <Text style={styles.label}>Username</Text>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="e.g. pixel_pilot"
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

          <Pressable
            style={[styles.button, isProfileLoading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isProfileLoading}
          >
            {isProfileLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => signOut().then(() => router.replace('/login'))}
            disabled={isProfileLoading}
          >
            <Text style={styles.secondaryButtonText}>Sign out</Text>
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
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
    gap: spacing.sm,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
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
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
});
