import 'react-native-url-polyfill/auto'
import { useEffect, useRef, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { View, ActivityIndicator } from 'react-native'
import { registerForPushNotifications, setupNotificationListeners } from '../lib/notifications'
import { savePushToken } from '../lib/api'
import { AuthzProvider } from '../components/AuthzProvider'
import { clearSession, getSession, setSession, type MobileSession } from '../lib/auth'

export default function RootLayout() {
  const [session, setAuthSession] = useState<MobileSession | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()
  const notificationResponseRef = useRef<Notifications.NotificationResponse | null>(null)

  useEffect(() => {
    getSession().then((session) => {
      setAuthSession(session)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    async function handleUrl(url: string) {
      const parsed = Linking.parse(url)

      // SECURITY: Only accept auth tokens from the exact expected callback path.
      // Accepting tokens from arbitrary deep links enables session-fixation attacks
      // where a malicious dotly:// link injects an attacker-controlled session.
      // The normalised path from expo-linking omits the leading slash.
      if (parsed.path !== 'auth/callback') {
        return
      }

      const params = parsed.queryParams ?? {}
      const payload = params['payload'] as string | undefined
      const type = params['type'] as string | undefined
      const token = params['token'] as string | undefined
      if (type === 'recovery' && token) {
        router.replace(`/(auth)/reset-password?token=${encodeURIComponent(token)}`)
        return
      }
      if (!payload) return
      let parsedPayload: { accessToken?: string; refreshToken?: string } | null = null
      try {
        parsedPayload = JSON.parse(payload) as { accessToken?: string; refreshToken?: string }
      } catch {
        parsedPayload = null
      }
      const accessToken = parsedPayload?.accessToken
      const refreshToken = parsedPayload?.refreshToken
      if (accessToken && refreshToken) {
        const nextSession = { accessToken, refreshToken }
        await setSession(nextSession)
        setAuthSession(nextSession)
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
        const contactId = typeof data?.contactId === 'string' ? data.contactId : null
        if (contactId) {
          router.push(`/contact/${contactId}`)
        }
      },
    )

    return () => {
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const response = await Notifications.getLastNotificationResponseAsync()
      if (!response || notificationResponseRef.current) return
      notificationResponseRef.current = response
      const data = response.notification.request.content.data as Record<string, unknown>
      const contactId = typeof data?.contactId === 'string' ? data.contactId : null
      if (contactId) {
        router.push(`/contact/${contactId}`)
      }
    })()
  }, [router])

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

  return (
    <AuthzProvider>
      <Slot />
    </AuthzProvider>
  )
}
