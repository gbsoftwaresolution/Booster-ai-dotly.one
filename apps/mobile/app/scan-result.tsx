import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { createContact } from '../lib/api'
import { api } from '../lib/api'

interface Card {
  id: string
  handle: string
}

// H-06: Sanitize a string received from URL params.
// - Strip ASCII control characters (0x00–0x1F, 0x7F) which can cause UI
//   rendering issues or be used for injection attacks.
// - Enforce a maximum length so a crafted deep link cannot pre-fill the
//   form with an arbitrarily long string.
function sanitizeParam(value: string | undefined, maxLength: number): string {
  if (!value) return ''
  const withoutControls = Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0)
      return (code >= 0x20 && code !== 0x7f) || code > 0x7f
    })
    .join('')
  return withoutControls.slice(0, maxLength)
}

export default function ScanResultScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    name: string
    email: string
    phone: string
    company: string
    title: string
    website: string
    address: string
  }>()

  // H-06: Apply sanitization when seeding initial state from URL params.
  const [name, setName] = useState(sanitizeParam(params.name, 100))
  const [email, setEmail] = useState(sanitizeParam(params.email, 254))
  const [phone, setPhone] = useState(sanitizeParam(params.phone, 30))
  const [company, setCompany] = useState(sanitizeParam(params.company, 100))
  const [title, setTitle] = useState(sanitizeParam(params.title, 100))
  const [website, setWebsite] = useState(sanitizeParam(params.website, 2048))
  const [address, setAddress] = useState(sanitizeParam(params.address, 300))
  const [saving, setSaving] = useState(false)
  const [firstCardId, setFirstCardId] = useState<string | null>(null)

  useEffect(() => {
    api
      .getCards()
      .then((cards: unknown[]) => {
        const list = cards as Card[]
        if (list.length > 0 && list[0]) setFirstCardId(list[0].id)
      })
      .catch(() => void 0)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a contact name.')
      return
    }
    setSaving(true)
    try {
      await createContact(firstCardId ?? '', {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        title: title.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
      })
      Alert.alert('Contact saved', `${name} has been added to your contacts.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#0ea5e9', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
            Scanned Card
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          Review and edit the extracted information, then save to your contacts.
        </Text>

        {[
          { label: 'Name *', value: name, setter: setName },
          { label: 'Email', value: email, setter: setEmail },
          { label: 'Phone', value: phone, setter: setPhone },
          { label: 'Company', value: company, setter: setCompany },
          { label: 'Title / Role', value: title, setter: setTitle },
          { label: 'Website', value: website, setter: setWebsite },
          { label: 'Address', value: address, setter: setAddress },
        ].map(({ label, value, setter }) => (
          <View key={label} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 }}>
              {label}
            </Text>
            <TextInput
              value={value}
              onChangeText={setter}
              placeholder={label.replace(' *', '')}
              placeholderTextColor="#94a3b8"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
                color: '#0f172a',
              }}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={saving}
          style={{
            marginTop: 12,
            backgroundColor: saving ? '#94a3b8' : '#0ea5e9',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Save Contact</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
