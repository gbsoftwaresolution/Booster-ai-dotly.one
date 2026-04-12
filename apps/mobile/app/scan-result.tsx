import type { CardListItemResponse } from '@dotly/types'
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { createContact } from '../lib/api'
import { api } from '../lib/api'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
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
  const [website, setWebsite] = useState(sanitizeParam(params.website, 500))
  const [address, setAddress] = useState(sanitizeParam(params.address, 300))
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<'name' | 'email' | 'phone' | 'company' | 'title' | 'website' | 'address', string>
    >
  >({})
  const [firstCardId, setFirstCardId] = useState<string | null>(null)
  const [cardContextResolved, setCardContextResolved] = useState(false)
  const [cardLookupError, setCardLookupError] = useState<string | null>(null)
  const cardLookupRequestIdRef = useRef(0)

  const loadCardContext = useCallback(() => {
    const requestId = ++cardLookupRequestIdRef.current
    setCardContextResolved(false)
    setCardLookupError(null)
    void api
      .getCards()
      .then((cards) => {
        if (cardLookupRequestIdRef.current !== requestId) return
        const list: CardListItemResponse[] = cards
        setFirstCardId(list.length > 0 && list[0] ? list[0].id : null)
      })
      .catch((err: unknown) => {
        if (cardLookupRequestIdRef.current !== requestId) return
        setFirstCardId(null)
        setCardLookupError(err instanceof Error ? err.message : 'Could not look up card context.')
      })
      .finally(() => {
        if (cardLookupRequestIdRef.current !== requestId) return
        setCardContextResolved(true)
      })
  }, [])

  useEffect(() => {
    setName(sanitizeParam(params.name, 100))
    setEmail(sanitizeParam(params.email, 254))
    setPhone(sanitizeParam(params.phone, 30))
    setCompany(sanitizeParam(params.company, 100))
    setTitle(sanitizeParam(params.title, 100))
    setWebsite(sanitizeParam(params.website, 500))
    setAddress(sanitizeParam(params.address, 300))
  }, [
    params.address,
    params.company,
    params.email,
    params.name,
    params.phone,
    params.title,
    params.website,
  ])

  useEffect(() => {
    loadCardContext()
  }, [loadCardContext])

  const setFieldValue = (
    field: keyof typeof fieldErrors,
    setter: (value: string) => void,
    value: string,
  ) => {
    setter(value)
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedCompany = company.trim()
    const trimmedTitle = title.trim()
    const trimmedWebsite = website.trim()
    const trimmedAddress = address.trim()
    const nextFieldErrors: Partial<
      Record<'name' | 'email' | 'phone' | 'company' | 'title' | 'website' | 'address', string>
    > = {}

    if (!trimmedName) {
      nextFieldErrors.name = 'Please enter a contact name.'
    } else if (trimmedName.length > 200) {
      nextFieldErrors.name = 'Name must be 200 characters or less.'
    }

    if (trimmedEmail) {
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        nextFieldErrors.email = 'Enter a valid email address.'
      } else if (trimmedEmail.length > 254) {
        nextFieldErrors.email = 'Email must be 254 characters or less.'
      }
    }

    if (trimmedPhone) {
      if (!PHONE_REGEX.test(trimmedPhone)) {
        nextFieldErrors.phone = 'Enter a valid phone number.'
      } else if (trimmedPhone.length > 50) {
        nextFieldErrors.phone = 'Phone must be 50 characters or less.'
      }
    }

    if (trimmedCompany.length > 500) {
      nextFieldErrors.company = 'Company must be 500 characters or less.'
    }

    if (trimmedTitle.length > 200) {
      nextFieldErrors.title = 'Title must be 200 characters or less.'
    }

    if (trimmedWebsite) {
      if (!isValidHttpUrl(trimmedWebsite)) {
        nextFieldErrors.website = 'Enter a valid website starting with http:// or https://.'
      } else if (trimmedWebsite.length > 500) {
        nextFieldErrors.website = 'Website must be 500 characters or less.'
      }
    }

    if (trimmedAddress.length > 500) {
      nextFieldErrors.address = 'Address must be 500 characters or less.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      Alert.alert('Fix the highlighted fields', 'Review the contact details and try again.')
      return
    }

    setFieldErrors({})
    setSaving(true)
    try {
      await createContact(firstCardId, {
        name: trimmedName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        company: trimmedCompany || null,
        title: trimmedTitle || null,
        website: trimmedWebsite || null,
        address: trimmedAddress || null,
      })
      Alert.alert('Contact saved', `${trimmedName} has been added to your contacts.`, [
        { text: 'OK', onPress: () => router.replace('/contacts') },
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
          <TouchableOpacity onPress={() => router.replace('/contacts')} style={{ marginRight: 12 }}>
            <Text style={{ color: '#0ea5e9', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
            Scanned Card
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          Review and edit the extracted information, then save to your contacts.
        </Text>

        {cardLookupError ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#fecaca',
              backgroundColor: '#fef2f2',
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: '#b91c1c', lineHeight: 18 }}>
              {cardLookupError}
            </Text>
            <TouchableOpacity onPress={loadCardContext} style={{ marginTop: 8 }}>
              <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 12 }}>
                Retry lookup
              </Text>
            </TouchableOpacity>
          </View>
        ) : cardContextResolved && !firstCardId ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#fde68a',
              backgroundColor: '#fffbeb',
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: '#92400e', lineHeight: 18 }}>
              This contact will be saved without a source card because no card is available on this
              device.
            </Text>
          </View>
        ) : null}

        {[
          { label: 'Name *', value: name, setter: setName, fieldKey: 'name' as const },
          { label: 'Email', value: email, setter: setEmail, fieldKey: 'email' as const },
          { label: 'Phone', value: phone, setter: setPhone, fieldKey: 'phone' as const },
          { label: 'Company', value: company, setter: setCompany, fieldKey: 'company' as const },
          { label: 'Title / Role', value: title, setter: setTitle, fieldKey: 'title' as const },
          { label: 'Website', value: website, setter: setWebsite, fieldKey: 'website' as const },
          { label: 'Address', value: address, setter: setAddress, fieldKey: 'address' as const },
        ].map(({ label, value, setter, fieldKey }) => {
          return (
            <View key={label} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 }}>
                {label}
              </Text>
              <TextInput
                value={value}
                onChangeText={(nextValue) => setFieldValue(fieldKey, setter, nextValue)}
                placeholder={label.replace(' *', '')}
                placeholderTextColor="#94a3b8"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: fieldErrors[fieldKey] ? '#dc2626' : '#e2e8f0',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: '#0f172a',
                }}
              />
              {fieldErrors[fieldKey] ? (
                <Text style={{ marginTop: 4, fontSize: 12, color: '#dc2626' }}>
                  {fieldErrors[fieldKey]}
                </Text>
              ) : null}
            </View>
          )
        })}

        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={saving || !cardContextResolved}
          style={{
            marginTop: 12,
            backgroundColor: saving || !cardContextResolved ? '#94a3b8' : '#0ea5e9',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
              {cardContextResolved ? 'Save Contact' : 'Checking source card...'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
