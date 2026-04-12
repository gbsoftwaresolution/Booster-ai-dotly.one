import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Linking from 'expo-linking'
import { Feather } from '@expo/vector-icons'
import { createCard, checkHandleAvailable, uploadAvatar } from '../../lib/api'

type Template = 'MINIMAL' | 'BOLD' | 'CREATIVE' | 'CORPORATE'

const TEMPLATES: { id: Template; label: string; description: string; color: string }[] = [
  { id: 'MINIMAL', label: 'Minimal', description: 'Clean and simple', color: '#0f172a' },
  { id: 'BOLD', label: 'Bold', description: 'Strong visual impact', color: '#dc2626' },
  { id: 'CREATIVE', label: 'Creative', description: 'Expressive and unique', color: '#7c3aed' },
  {
    id: 'CORPORATE',
    label: 'Corporate',
    description: 'Professional and polished',
    color: '#0284c7',
  },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateCardProfile(input: { email: string; website: string }): string | null {
  if (input.email.trim() && !EMAIL_RE.test(input.email.trim())) {
    return 'Enter a valid email address.'
  }

  if (input.website.trim()) {
    try {
      const normalized = /^https?:\/\//i.test(input.website.trim())
        ? input.website.trim()
        : `https://${input.website.trim()}`
      const url = new URL(normalized)
      if (!['http:', 'https:'].includes(url.protocol)) return 'Enter a valid website URL.'
    } catch {
      return 'Enter a valid website URL.'
    }
  }

  return null
}

export default function CreateCardScreen() {
  const router = useRouter()

  // Step state: 0=Basic, 1=Template, 2=Profile, 3=Review
  const [step, setStep] = useState(0)

  // Step 1 fields
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [tagline, setTagline] = useState('')
  const [handleAvailable, setHandleAvailable] = useState<boolean | 'unknown' | null>(null)
  const [checkingHandle, setCheckingHandle] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleRequestIdRef = useRef(0)

  // Step 2 fields
  const [template, setTemplate] = useState<Template>('MINIMAL')

  // Step 3 fields
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)
  const [avatarMime, setAvatarMime] = useState<string>('image/jpeg')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')

  // Step 4
  const [creating, setCreating] = useState(false)
  const [handleCheckError, setHandleCheckError] = useState<string | null>(null)
  const [handleRetryToken, setHandleRetryToken] = useState(0)

  // Debounced handle availability check
  const retryHandleCheck = () => {
    setHandleCheckError(null)
    setHandleRetryToken((current) => current + 1)
  }

  useEffect(() => {
    if (!handle) {
      handleRequestIdRef.current += 1
      setHandleAvailable(null)
      setCheckingHandle(false)
      setHandleCheckError(null)
      return
    }
    setHandleAvailable('unknown')
    setCheckingHandle(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const requestId = ++handleRequestIdRef.current
      try {
        const result = await checkHandleAvailable(handle)
        if (handleRequestIdRef.current !== requestId) return
        setHandleAvailable(result.available)
        setHandleCheckError(null)
      } catch (err) {
        if (handleRequestIdRef.current !== requestId) return
        setHandleAvailable(null)
        setHandleCheckError(
          err instanceof Error ? err.message : 'Could not verify handle availability.',
        )
      } finally {
        if (handleRequestIdRef.current === requestId) {
          setCheckingHandle(false)
        }
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [handle, handleRetryToken])

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to add an avatar.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ])
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setAvatarBase64(asset.base64 ?? null)
      setAvatarMime(asset.mimeType ?? 'image/jpeg')
    }
  }

  async function handleCreate() {
    const profileError = validateCardProfile({ email, website })
    if (profileError) {
      Alert.alert('Validation', profileError)
      return
    }

    setCreating(true)
    try {
      const created = (await createCard({
        name,
        handle,
        template,
        tagline,
        bio,
        phone,
        email,
        website,
      })) as { id: string }

      // Upload avatar if selected
      if (avatarBase64 && created.id) {
        try {
          await uploadAvatar(created.id, avatarBase64, avatarMime)
        } catch {
          Alert.alert(
            'Avatar upload failed',
            'Your card was created, but the profile photo did not upload. You can retry from Edit Card.',
          )
        }
      }

      router.replace(`/card/${created.id}`)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create card.')
    } finally {
      setCreating(false)
    }
  }

  const canProceedStep0 =
    name.trim().length > 0 &&
    handle.trim().length > 0 &&
    !checkingHandle &&
    handleAvailable === true

  const STEP_TITLES = ['Basic Info', 'Template', 'Profile', 'Review & Create']

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          }}
        >
          <TouchableOpacity
            onPress={() => (step > 0 ? setStep(step - 1) : router.replace('/(tabs)'))}
            style={{ marginRight: 12, width: 28, alignItems: 'center' }}
          >
            {step > 0 ? (
              <Feather name="chevron-left" size={20} color="#0ea5e9" />
            ) : (
              <Feather name="x" size={20} color="#0ea5e9" />
            )}
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#0f172a', flex: 1 }}>
            New Card — {STEP_TITLES[step]}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            {step + 1}/{STEP_TITLES.length}
          </Text>
        </View>

        {/* Step progress bar */}
        <View style={{ height: 3, backgroundColor: '#e2e8f0' }}>
          <View
            style={{
              height: 3,
              backgroundColor: '#0ea5e9',
              width: `${((step + 1) / STEP_TITLES.length) * 100}%`,
            }}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <View style={{ gap: 16 }}>
              <View>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}
                >
                  Display Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Jane Doe"
                  placeholderTextColor="#9ca3af"
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
              </View>

              <View>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}
                >
                  Handle *{' '}
                  <Text style={{ fontWeight: '400', color: '#9ca3af' }}>
                    (your public URL: dotly.one/card/
                    <Text style={{ color: '#0ea5e9' }}>{handle || '...'}</Text>)
                  </Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={handle}
                    onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="jane-doe"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor:
                        handleAvailable === false
                          ? '#ef4444'
                          : handleAvailable === true
                            ? '#22c55e'
                            : '#d1d5db',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 15,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  />
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {checkingHandle ? (
                      <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : handle.length > 0 ? (
                      handleAvailable === true ? (
                        <Feather name="check-circle" size={18} color="#22c55e" />
                      ) : handleAvailable === false ? (
                        <Feather name="x-circle" size={18} color="#ef4444" />
                      ) : null
                    ) : null}
                  </View>
                </View>
                {handleAvailable === false && (
                  <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                    Handle is taken. Try another.
                  </Text>
                )}
                {handleAvailable === true && (
                  <Text style={{ color: '#22c55e', fontSize: 12, marginTop: 4 }}>
                    Handle is available!
                  </Text>
                )}
                {handleCheckError && (
                  <TouchableOpacity onPress={retryHandleCheck}>
                    <Text style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>
                      {handleCheckError} Tap to retry.
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}
                >
                  Tagline
                </Text>
                <TextInput
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Software Engineer at Acme Co."
                  placeholderTextColor="#9ca3af"
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
              </View>
            </View>
          )}

          {/* ── Step 1: Template ── */}
          {step === 1 && (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 15, color: '#64748b', marginBottom: 4 }}>
                Choose a visual template for your card.
              </Text>
              {TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTemplate(t.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: template === t.id ? t.color : '#e2e8f0',
                    backgroundColor: template === t.id ? `${t.color}10` : '#ffffff',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: t.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>
                      {t.label[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15 }}>
                      {t.label}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>{t.description}</Text>
                  </View>
                  {template === t.id && (
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: t.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="check" size={12} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Step 2: Profile ── */}
          {step === 2 && (
            <View style={{ gap: 16 }}>
              {/* Avatar picker */}
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => void pickAvatar()}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: avatarBase64 ? '#0ea5e9' : '#e2e8f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#0ea5e9',
                    borderStyle: 'dashed',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{ alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 }}
                  >
                    <Feather
                      name={avatarBase64 ? 'check-circle' : 'upload-cloud'}
                      size={18}
                      color={avatarBase64 ? '#ffffff' : '#64748b'}
                    />
                    <Text
                      style={{
                        color: avatarBase64 ? '#ffffff' : '#64748b',
                        fontSize: 12,
                        textAlign: 'center',
                      }}
                    >
                      {avatarBase64 ? 'Photo\nselected' : 'Tap to\nupload'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                  Profile photo (optional)
                </Text>
              </View>

              {[
                {
                  label: 'Bio',
                  value: bio,
                  setter: setBio,
                  placeholder: 'Tell people about yourself...',
                  multiline: true,
                },
                {
                  label: 'Phone',
                  value: phone,
                  setter: setPhone,
                  placeholder: '+1 (555) 000-0000',
                  multiline: false,
                },
                {
                  label: 'Email',
                  value: email,
                  setter: setEmail,
                  placeholder: 'jane@example.com',
                  multiline: false,
                },
                {
                  label: 'Website',
                  value: website,
                  setter: setWebsite,
                  placeholder: 'https://janedoe.com',
                  multiline: false,
                },
              ].map((field) => (
                <View key={field.label}>
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}
                  >
                    {field.label}
                  </Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9ca3af"
                    multiline={field.multiline}
                    numberOfLines={field.multiline ? 3 : 1}
                    style={{
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 15,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      minHeight: field.multiline ? 80 : undefined,
                      textAlignVertical: field.multiline ? 'top' : 'center',
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* ── Step 3: Review & Create ── */}
          {step === 3 && (
            <View style={{ gap: 16 }}>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  gap: 12,
                }}
              >
                <Text
                  style={{ fontWeight: '700', color: '#0f172a', fontSize: 16, marginBottom: 4 }}
                >
                  Card Summary
                </Text>
                {[
                  ['Name', name],
                  ['Handle', `dotly.one/card/${handle}`],
                  ['Template', template],
                  ['Tagline', tagline || '—'],
                  ['Email', email || '—'],
                  ['Phone', phone || '—'],
                  ['Website', website || '—'],
                  ['Bio', bio ? `${bio.slice(0, 60)}${bio.length > 60 ? '…' : ''}` : '—'],
                  ['Avatar', avatarBase64 ? 'Selected' : 'None'],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ width: 72, color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>
                      {label}
                    </Text>
                    <Text style={{ flex: 1, color: '#0f172a', fontSize: 13 }}>{value}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => void handleCreate()}
                disabled={creating}
                style={{
                  backgroundColor: creating ? '#94a3b8' : '#0ea5e9',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
                    Create Card
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom Next button (steps 0–2) */}
        {step < 3 && (
          <View
            style={{
              padding: 16,
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
            }}
          >
            <TouchableOpacity
              onPress={() => setStep(step + 1)}
              disabled={step === 0 && !canProceedStep0}
              style={{
                backgroundColor: step === 0 && !canProceedStep0 ? '#94a3b8' : '#0ea5e9',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
                {step === 2 ? 'Review' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
