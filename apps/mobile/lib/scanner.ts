import * as ImagePicker from 'expo-image-picker'

export async function pickBusinessCardImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') return null

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
    allowsEditing: true,
    aspect: [16, 9],
  })

  if (result.canceled || !result.assets?.[0]?.base64) return null
  return result.assets[0].base64
}
