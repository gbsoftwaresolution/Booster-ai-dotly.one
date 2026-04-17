import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { apiPost } from '../../lib/api'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ token?: string }>()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      if (!params.token) {
        throw new Error('Missing password reset token.')
      }
      await apiPost('/auth/reset-password', {
        token: params.token,
        password,
      })
      Alert.alert('Password updated', 'Your password has been reset successfully.', [
        { text: 'Continue', onPress: () => router.replace('/(auth)/sign-in') },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#ffffff',
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 12 }}>
        Reset your password
      </Text>
      <Text style={{ fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 24 }}>
        Choose a new password for your Dotly account.
      </Text>

      <View style={{ gap: 14 }}>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor="#94a3b8"
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: '#0f172a',
          }}
        />
        <TextInput
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#94a3b8"
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: '#0f172a',
          }}
        />

        {error ? <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text> : null}

        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={saving}
          style={{
            backgroundColor: '#0ea5e9',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>
              Update Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
