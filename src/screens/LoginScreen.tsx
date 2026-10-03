// Login Screen for Single-User Supabase Auth
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, isDark } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          onLoginSuccess();
        } else if (data.user) {
          setSuccessMsg('Account created successfully! If email confirmation is required, please check your inbox, or sign in now.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: colors.accent }]}>
            <Ionicons name="sparkles" size={28} color="#ffffff" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>CULTUS</Text>
          <Text style={[styles.subtitle, { color: colors.foregroundMuted }]}>
            Sartorial Intelligence & Wardrobe Planner
          </Text>
        </View>

        {/* Login Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>

          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={[styles.errorText, { color: '#22c55e' }]}>{successMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.foregroundMuted }]}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.muted, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.foregroundMuted} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.foregroundMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.foregroundMuted }]}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.muted, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.foregroundMuted} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="••••••••••••"
                placeholderTextColor={colors.foregroundMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isSignUp ? 'Create Account' : 'Continue to Wardrobe'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Mode Switcher */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            style={styles.switchModeButton}
          >
            <Text style={[styles.switchModeText, { color: colors.accent }]}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create One"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerNote, { color: colors.foregroundMuted }]}>
          Secure authentication powered by Supabase Auth.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  submitButton: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  switchModeButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
  },
});

