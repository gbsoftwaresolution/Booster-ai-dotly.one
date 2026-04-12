import { TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { pickBusinessCardImage } from '../lib/scanner'
import { scanBusinessCard } from '../lib/api'

interface ScanCardButtonProps {
  style?: object
}

export function ScanCardButton({ style }: ScanCardButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    try {
      setLoading(true)
      const picked = await pickBusinessCardImage()
      if (picked.status === 'permission-denied') {
        Alert.alert('Camera access needed', 'Allow camera access to scan a business card.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ])
        setLoading(false)
        return
      }
      if (picked.status === 'cancelled') {
        setLoading(false)
        return
      }

      const result = await scanBusinessCard(picked.base64, picked.mimeType)

      router.push({
        pathname: '/scan-result',
        params: {
          name: result.name ?? '',
          email: result.email ?? '',
          phone: result.phone ?? '',
          company: result.company ?? '',
          title: result.title ?? '',
          website: result.website ?? '',
          address: result.address ?? '',
        },
      } as never)
    } catch (err) {
      Alert.alert('Scan failed', err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TouchableOpacity
      onPress={() => void handleScan()}
      disabled={loading}
      style={[
        {
          backgroundColor: '#0ea5e9',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="camera" size={22} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  )
}
