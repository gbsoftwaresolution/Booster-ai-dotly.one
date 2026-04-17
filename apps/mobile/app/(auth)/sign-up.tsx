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
import { apiPost } from '../../lib/api'
import { setSession } from '../../lib/auth'

export default function SignUpScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    setError(null)

    // Client-side validation
    if (!name.trim()) {
      setError('Full name is required.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const session = await apiPost<{
        accessToken: string
        refreshToken: string
      }>('/auth/sign-up', {
        name: name.trim(),
        email: email.trim(),
        password,
      })
      await setSession(session)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          backgroundColor: '#ffffff',
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 12 }}>
          Check your email
        </Text>
        <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 }}>
          We sent a confirmation link to{' '}
          <Text style={{ fontWeight: '600', color: '#0ea5e9' }}>{email}</Text>. Open it to activate
          your account.
        </Text>
        <Link href="/(auth)/sign-in" style={{ marginTop: 32 }}>
          <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 15 }}>Back to Sign In</Text>
        </Link>
      </View>
    )
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
              Create your account
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
              }}
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              autoComplete="name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
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
              onChangeText={setEmail}
            />

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
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
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />

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

            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
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
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign-in link */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 28,
              gap: 4,
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 14 }}>Already have an account?</Text>
            <Link href="/(auth)/sign-in">
              <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>Sign in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
