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
import type { AppTheme } from '@/src/lib/themeStore';
import { z } from 'zod';



import { getCollegeEmailDomain, getRoleHomeRoute, SETUP_PROFILE_ROUTE } from '@/src/lib/auth';

import { AppLogo } from '@/src/components/AppLogo';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

import { useAuthStore } from '@/src/lib/authStore';

import { borderRadius, spacing } from '@/src/theme';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { signIn, isProfileLoading, authError, clearError, user, profile, needsProfileSetup } =

    useAuthStore();



  const {

    control,

    handleSubmit,
    formState: { errors },

  } = useForm<LoginForm>({

    resolver: zodResolver(loginSchema),

    defaultValues: { email: '', password: '' },

  });

  const bottomPadding = useBottomContentPadding();
  const responsive = useResponsiveLayout();

  const collegeDomain = getCollegeEmailDomain();



  useEffect(() => {

    if (user && profile) {

      if (needsProfileSetup) {

        router.replace(SETUP_PROFILE_ROUTE);

        return;

      }

      router.replace(getRoleHomeRoute(profile.role));

    }

  }, [user, profile, needsProfileSetup]);



  const onSubmit = async (data: LoginForm) => {

    clearError();

    try {

      await signIn(data.email, data.password);

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

            <AppLogo size={72} />

            <View style={styles.heroText}>

              <Text style={styles.heroLabel}>Citians</Text>

              <Text style={styles.heroTitle}>Sign in to continue</Text>

            </View>

          </View>

          <Text style={styles.heroSubtitle}>

            Learn, connect, and stay involved across campus.

          </Text>

        </View>



        <View style={[styles.formCard, styles.cardShadow]}>

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



          <Pressable style={styles.linkButton} onPress={() => router.push('/register')}>

            <Text style={styles.linkText}>First time here? Create an account</Text>

          </Pressable>

        </View>



        <View style={styles.helper}>

          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />

          <Text style={styles.helperText}>

            Only @{collegeDomain} college emails are allowed. New students pick a username to stay

            comfortable participating across campus spaces.

          </Text>

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

  },

  heroBrand: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.md,

    marginBottom: spacing.sm,

  },

  heroText: {

    flex: 1,

    gap: 2,

  },

  heroLabel: {

    color: theme.colors.secondary,

    fontSize: 14,

    fontWeight: '600',

    marginBottom: spacing.xs,

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

    marginBottom: spacing.md,

  },

  formTitle: {

    ...theme.typography.heading,

    marginBottom: spacing.md,

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

  inputError: {

    borderColor: theme.colors.error,

  },

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

  buttonDisabled: {

    opacity: 0.7,

  },

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

  helper: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    paddingHorizontal: spacing.xs,

  },

  helperText: {

    flex: 1,

    ...theme.typography.caption,

    lineHeight: 18,

  },

  devHint: {

    marginTop: spacing.md,

    backgroundColor: theme.colors.accentBg,

    borderRadius: borderRadius.sm,

    padding: spacing.md,

    borderWidth: 1,

    borderColor: theme.colors.accentBorder,

  },

  devHintTitle: {

    fontSize: 13,

    fontWeight: '700',

    color: theme.colors.primary,

    marginBottom: spacing.xs,

  },

  devHintText: {

    fontSize: 12,

    color: theme.colors.textMuted,

    lineHeight: 18,

  },

});
