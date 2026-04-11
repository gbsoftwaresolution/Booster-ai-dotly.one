import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  async function handleSignIn() {
    const trimmedEmail = email.trim().toLowerCase()
    const nextFieldErrors: { email?: string; password?: string } = {}

    if (!trimmedEmail) {
      nextFieldErrors.email = 'Email is required.'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextFieldErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextFieldErrors.password = 'Password is required.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before continuing.')
      return
    }

    setLoading(true)
    setError(null)
    setFieldErrors({})
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })
    if (signInError) {
      setError(signInError.message)
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setFieldErrors((prev) => ({ ...prev, email: 'Email is required.' }))
      setError('Enter your email address first to reset your password.')
      return
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setFieldErrors((prev) => ({ ...prev, email: 'Enter a valid email address.' }))
      setError('Enter a valid email address to reset your password.')
      return
    }

    setResetting(true)
    setError(null)
    setResetMessage(null)
    setFieldErrors((prev) => ({ ...prev, email: undefined }))
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'https://dotly.one/auth?mode=reset',
      })
      if (resetError) throw resetError
      setResetMessage('Password reset link sent. Check your email.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link')
    } finally {
      setResetting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            backgroundColor: '#ffffff',
          }}
        >
          {/* Branding */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#0ea5e9',
                letterSpacing: -1,
              }}
            >
              Dotly
            </Text>
            <Text style={{ fontSize: 15, color: '#64748b', marginTop: 6 }}>
              Your digital business card
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: fieldErrors.email ? '#dc2626' : '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
              }}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={(value) => {
                setEmail(value)
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              accessibilityLabel="Email"
            />
            {fieldErrors.email ? (
              <Text style={{ color: '#dc2626', fontSize: 13, marginTop: -6 }}>
                {fieldErrors.email}
              </Text>
            ) : null}

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: fieldErrors.password ? '#dc2626' : '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
              }}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={(value) => {
                setPassword(value)
                setFieldErrors((prev) => ({ ...prev, password: undefined }))
              }}
              accessibilityLabel="Password"
            />
            {fieldErrors.password ? (
              <Text style={{ color: '#dc2626', fontSize: 13, marginTop: -6 }}>
                {fieldErrors.password}
              </Text>
            ) : null}

            {error ? (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
              </View>
            ) : null}

            {resetMessage ? (
              <View
                style={{
                  backgroundColor: '#ecfdf5',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#047857', fontSize: 14 }}>{resetMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityHint="Signs in with your email and password"
              style={{
                backgroundColor: loading ? '#7dd3fc' : '#0ea5e9',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={resetting}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
              accessibilityHint="Emails you a password reset link"
              style={{
                alignSelf: 'center',
                marginTop: 2,
                paddingVertical: 6,
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: '#0ea5e9', fontSize: 14, fontWeight: '600' }}>
                {resetting ? 'Sending reset link...' : 'Forgot password?'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign-up link */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 28,
              gap: 4,
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 14 }}>Don&apos;t have an account?</Text>
            <Link href="/(auth)/sign-up">
              <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>Sign up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
