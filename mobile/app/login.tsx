import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { LoginFormData } from '../types';
import { colors, shadows, borderRadius, spacing } from '../constants/theme';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// Icons
function BoxLogo() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8V21H3V8M23 3H1V8H23V3Z"
        stroke={colors.textOnPurple}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 12H14" stroke={colors.textOnPurple} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function EmailIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.purple : colors.textMuted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6L10.1 10.6C11.3 11.5 12.7 11.5 13.9 10.6L20 6M4 18H20C21.1 18 22 17.1 22 16V8C22 6.9 21.1 6 20 6H4C2.9 6 2 6.9 2 8V16C2 17.1 2.9 18 4 18Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.purple : colors.textMuted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15V17M6 21H18C19.1 21 20 20.1 20 19V13C20 11.9 19.1 11 18 11H6C4.9 11 4 11.9 4 13V19C4 20.1 4.9 21 6 21ZM16 11V7C16 4.8 14.2 3 12 3C9.8 3 8 4.8 8 7V11H16Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 5C5.6 5 2 12 2 12C2 12 5.6 19 12 19C18.4 19 22 12 22 12C22 12 18.4 5 12 5Z"
          stroke={colors.purple}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="12" cy="12" r="3" stroke={colors.purple} strokeWidth={1.5} />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C2 12 5.6 5 12 5C18.4 5 22 12 22 12"
        stroke={colors.textMuted}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M2 12C2 12 5.6 19 12 19C18.4 19 22 12 22 12"
        stroke={colors.textMuted}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path d="M4 4L20 20" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke={colors.textOnPurple}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { checkConnection } = useNetworkStatus();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const isConnected = await checkConnection();
    if (!isConnected) return;

    const result = await login(data);
    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Logo/Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <BoxLogo />
              </View>
              <Text style={styles.title}>CatchORama</Text>
              <Text style={styles.subtitle}>Inventory Management</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.instructionText}>Sign in to manage your inventory</Text>
              
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[
                        styles.inputWrapper,
                        focusedField === 'email' && styles.inputWrapperFocused,
                        errors.email && styles.inputWrapperError,
                      ]}>
                        <View style={styles.inputIcon}>
                          <EmailIcon focused={focusedField === 'email'} />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="you@example.com"
                          placeholderTextColor={colors.inputPlaceholder}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => {
                            setFocusedField(null);
                            onBlur();
                          }}
                          onChangeText={onChange}
                          value={value}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    )}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[
                        styles.inputWrapper,
                        focusedField === 'password' && styles.inputWrapperFocused,
                        errors.password && styles.inputWrapperError,
                      ]}>
                        <View style={styles.inputIcon}>
                          <LockIcon focused={focusedField === 'password'} />
                        </View>
                        <TextInput
                          style={[styles.input, styles.passwordInput]}
                          placeholder="Enter your password"
                          placeholderTextColor={colors.inputPlaceholder}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => {
                            setFocusedField(null);
                            onBlur();
                          }}
                          onChangeText={onChange}
                          value={value}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <EyeIcon visible={showPassword} />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password.message}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.textOnPurple} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <ArrowRightIcon />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerDivider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerDot} />
                <View style={styles.dividerLine} />
              </View>
              <Text style={styles.footerText}>
                Premium Inventory Management
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.md,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  instructionText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  form: {},
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: colors.purple,
    backgroundColor: colors.purpleSubtle,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
    ...shadows.lg,
  },
  buttonDisabled: {
    backgroundColor: colors.purpleMuted,
  },
  buttonText: {
    color: colors.textOnPurple,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.purple,
    marginHorizontal: spacing.md,
  },
  footerText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
});
