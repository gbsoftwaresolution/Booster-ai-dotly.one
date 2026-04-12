import * as ImagePicker from 'expo-image-picker'

export type ScanPickResult =
  | { status: 'success'; base64: string; mimeType: string }
  | { status: 'permission-denied' }
  | { status: 'cancelled' }

export async function pickBusinessCardImage(): Promise<ScanPickResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') return { status: 'permission-denied' }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
    allowsEditing: true,
    aspect: [16, 9],
  })

  if (result.canceled || !result.assets?.[0]?.base64) return { status: 'cancelled' }
  return {
    status: 'success',
    base64: result.assets[0].base64,
    mimeType: result.assets[0].mimeType ?? 'image/jpeg',
  }
}
