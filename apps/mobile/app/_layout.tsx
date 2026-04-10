import 'react-native-url-polyfill/auto'
import { useEffect, useRef, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../lib/supabase'
import { View, ActivityIndicator } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import type * as Notifications from 'expo-notifications'
import { registerForPushNotifications, setupNotificationListeners } from '../lib/notifications'
import { savePushToken } from '../lib/api'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()
  const notificationResponseRef = useRef<Notifications.NotificationResponse | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Handle deep links for Supabase email confirmation (magic links, password reset, etc.)
  // The app scheme is "dotly" (see app.json). Supabase redirects to:
  //   dotly://auth/callback?access_token=...&refresh_token=...&type=...
  // expo-linking surfaces this URL so we can hand the tokens to the Supabase client.
  useEffect(() => {
    async function handleUrl(url: string) {
      // Parse fragment-style tokens (#access_token=...) as well as query params
      const parsed = Linking.parse(url)

      // SECURITY: Only accept auth tokens from the exact expected callback path.
      // Accepting tokens from arbitrary deep links enables session-fixation attacks
      // where a malicious dotly:// link injects an attacker-controlled session.
      // The normalised path from expo-linking omits the leading slash.
      if (parsed.path !== 'auth/callback') {
        return
      }

      const params = parsed.queryParams ?? {}
      // Supabase sometimes encodes tokens in the fragment; expo-linking puts them in queryParams
      const accessToken = params['access_token'] as string | undefined
      const refreshToken = params['refresh_token'] as string | undefined
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
    }

    // Handle the URL that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) void handleUrl(url)
    })

    // Handle URLs received while the app is already running (warm start)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url)
    })

    return () => subscription.remove()
  }, [])

  // Register push notifications and set up listeners
  useEffect(() => {
    registerForPushNotifications()
      .then((token) => {
        if (token) {
          void savePushToken(token).catch(() => void 0)
        }
      })
      .catch(() => void 0)

    const cleanup = setupNotificationListeners(
      () => {
        // Notification received while app is foregrounded — no action needed
      },
      (response: Notifications.NotificationResponse) => {
        notificationResponseRef.current = response
        const data = response.notification.request.content.data as Record<string, unknown>
        if (data?.contactId) {
          router.push(`/(tabs)/contacts`)
        }
      },
    )

    return () => {
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments, router])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  return <Slot />
}
