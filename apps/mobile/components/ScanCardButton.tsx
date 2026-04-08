import { TouchableOpacity, Text, Alert, ActivityIndicator, View } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
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
      const base64 = await pickBusinessCardImage()
      if (!base64) {
        setLoading(false)
        return
      }

      const result = await scanBusinessCard(base64, 'image/jpeg')

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
          {/* Camera icon via unicode */}
          <Text style={{ fontSize: 22 }}>📷</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
