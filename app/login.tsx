import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import {
  Colors,
  Fonts,
  Glassmorphism,
  RoundedGeometry,
  Typography,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If user is already authenticated, redirect to home planner
  React.useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (isSignUp && cleanPassword !== (confirmPassword || '').trim()) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    console.log('[LoginScreen] handleSubmit called:', {
      isSignUp,
      email: JSON.stringify(cleanEmail),
      passwordLength: cleanPassword.length,
    });

    try {
      if (isSignUp) {
        await signUpWithEmail(cleanEmail, cleanPassword);
      } else {
        await signInWithEmail(cleanEmail, cleanPassword);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[LoginScreen] Auth error caught:', err);
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
        setErrorMessage('Please enter a valid email address.');
      } else if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        msg.includes('invalid-credential') ||
        msg.includes('user-not-found') ||
        msg.includes('wrong-password')
      ) {
        setErrorMessage('Invalid email or password.');
      } else if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
        setErrorMessage('An account with this email already exists.');
      } else if (code === 'auth/weak-password' || msg.includes('weak-password')) {
        setErrorMessage('Password should be at least 6 characters.');
      } else if (code === 'auth/argument-error' || msg.includes('argument-error')) {
        setErrorMessage('Please enter a valid email and password.');
      } else {
        setErrorMessage(msg || 'Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[LoginScreen] Google Auth error caught:', err);
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code !== 'auth/popup-closed-by-user' && !msg.includes('popup-closed-by-user')) {
        if (code === 'auth/argument-error' || msg.includes('argument-error')) {
          setErrorMessage('Google Sign-In failed due to invalid configuration.');
        } else {
          setErrorMessage(msg || 'Google sign in failed.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >


          {/* Main Glassmorphic Auth Card */}
          <View
            style={[
              styles.authCard,
              {
                backgroundColor: theme.glassBackground,
                borderColor: theme.glassBorder,
              },
            ]}
          >
            {/* Mode Switcher Tabs */}
            <View
              style={[
                styles.tabSwitcher,
                { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setIsSignUp(false);
                  setErrorMessage(null);
                }}
                style={[
                  styles.tabButton,
                  !isSignUp && { backgroundColor: theme.primaryAction },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: !isSignUp ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setIsSignUp(true);
                  setErrorMessage(null);
                }}
                style={[
                  styles.tabButton,
                  isSignUp && { backgroundColor: theme.primaryAction },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isSignUp ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Alert */}
            {errorMessage && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: theme.errorContainer, borderColor: theme.error },
                ]}
              >
                <Text style={[styles.errorText, { color: theme.onErrorContainer }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Google Auth Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGoogleSignIn}
              disabled={submitting}
              style={[
                styles.googleButton,
                {
                  backgroundColor: theme.surfaceContainerHigh,
                  borderColor: theme.outlineVariant,
                },
              ]}
            >
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={[styles.googleButtonText, { color: theme.text }]}>
                {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.outlineVariant }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR WITH EMAIL</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.outlineVariant }]} />
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>EMAIL</Text>
              <TextInput
                style={[
                  styles.inputField,
                  {
                    backgroundColor: theme.surfaceContainer,
                    color: theme.text,
                    borderColor: theme.outlineVariant,
                  },
                ]}
                placeholder="name@company.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PASSWORD</Text>
              <TextInput
                style={[
                  styles.inputField,
                  {
                    backgroundColor: theme.surfaceContainer,
                    color: theme.text,
                    borderColor: theme.outlineVariant,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {isSignUp && (
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  CONFIRM PASSWORD
                </Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: theme.surfaceContainer,
                      color: theme.text,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={submitting}
              style={[
                styles.submitButton,
                { backgroundColor: theme.primaryAction },
                submitting && { opacity: 0.7 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  authCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RoundedGeometry.xl, // 24px container radius
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    ...Glassmorphism,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: RoundedGeometry.default, // 8px base radius
    padding: 3,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RoundedGeometry.default - 2, // 6px
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    borderRadius: RoundedGeometry.default, // 8px base radius
    padding: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RoundedGeometry.default, // 8px base radius
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  googleIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    fontFamily: Fonts.headline,
  },
  googleButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputField: {
    fontFamily: Fonts.body,
    fontSize: 14,
    borderRadius: RoundedGeometry.default, // 8px base radius
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  submitButton: {
    borderRadius: RoundedGeometry.default, // 8px base radius
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
