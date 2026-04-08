import { useState, useEffect } from 'react'
import { Platform, TouchableOpacity, Text, Alert, ActivityIndicator, View } from 'react-native'
import { initNfc, writeCardUrlToNfc } from '../lib/nfc'

interface NfcWriteButtonProps {
  handle: string
}

export function NfcWriteButton({ handle }: NfcWriteButtonProps) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [writing, setWriting] = useState(false)

  useEffect(() => {
    // NFC is only available on iOS and Android
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      setSupported(false)
      return
    }

    initNfc()
      .then((isSupported) => setSupported(isSupported))
      .catch(() => setSupported(false))
  }, [])

  if (supported === null) {
    // Still checking
    return null
  }

  if (!supported) {
    return (
      <View
        style={{
          backgroundColor: '#f1f5f9',
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          marginTop: 8,
        }}
      >
        <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 14 }}>
          NFC not supported on this device
        </Text>
      </View>
    )
  }

  async function handleWrite() {
    setWriting(true)
    try {
      const url = `https://dotly.one/card/${handle}`
      await writeCardUrlToNfc(url)
      Alert.alert('Success', `NFC tag written with your card URL: ${url}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to write NFC tag. Make sure a tag is nearby.'
      Alert.alert('NFC Write Failed', message)
    } finally {
      setWriting(false)
    }
  }

  return (
    <TouchableOpacity
      onPress={() => {
        void handleWrite()
      }}
      disabled={writing}
      style={{
        backgroundColor: writing ? '#7dd3fc' : '#0ea5e9',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        opacity: writing ? 0.8 : 1,
      }}
    >
      {writing && <ActivityIndicator size="small" color="#ffffff" />}
      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
        {writing ? 'Hold tag near phone...' : 'Write to NFC Tag'}
      </Text>
    </TouchableOpacity>
  )
}
