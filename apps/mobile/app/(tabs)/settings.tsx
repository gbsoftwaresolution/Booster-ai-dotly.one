import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function SettingsTab() {
  const [session, setSession] = useState<Session | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
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
        {session?.user?.email ? (
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
            <Text style={{ fontSize: 15, color: '#0f172a', fontWeight: '500' }}>
              {session.user.email}
            </Text>
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
