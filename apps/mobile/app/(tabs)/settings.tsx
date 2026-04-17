import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native'
import { apiPost, clearPushToken } from '../../lib/api'
import { clearSession, getSession, type MobileSession } from '../../lib/auth'

export default function SettingsTab() {
  const [session, setAuthSession] = useState<MobileSession | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    getSession().then((session) => {
      setAuthSession(session)
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await clearPushToken().catch(() => void 0)
      await apiPost('/auth/sign-out', { refreshToken: session?.refreshToken ?? null })
      await clearSession()
      setAuthSession(null)
    } catch (error) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 }}>
          Settings
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 20 }}>
        {/* User info */}
        {session?.accessToken ? (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 4 }}>
              SIGNED IN AS
            </Text>
            <Text style={{ fontSize: 15, color: '#0f172a', fontWeight: '500' }}>Authenticated</Text>
          </View>
        ) : null}

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          style={{
            backgroundColor: signingOut ? '#fca5a5' : '#ef4444',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          {signingOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
