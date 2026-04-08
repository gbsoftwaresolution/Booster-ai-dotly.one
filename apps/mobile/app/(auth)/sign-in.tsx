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

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setError(signInError.message)
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
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
              autoComplete="current-password"
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
              onPress={handleSignIn}
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
                  Sign In
                </Text>
              )}
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
            <Text style={{ color: '#64748b', fontSize: 14 }}>
              Don&apos;t have an account?
            </Text>
            <Link href="/(auth)/sign-up">
              <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>
                Sign up
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
