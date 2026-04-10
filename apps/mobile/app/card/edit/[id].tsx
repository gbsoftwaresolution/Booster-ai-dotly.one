import { useState, useEffect, useRef, useCallback } from 'react'
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
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'
import { api, updateCard, uploadAvatar } from '../../../lib/api'

type Template = 'MINIMAL' | 'BOLD' | 'CREATIVE' | 'CORPORATE'

const TEMPLATES: { id: Template; label: string; color: string }[] = [
  { id: 'MINIMAL', label: 'Minimal', color: '#0f172a' },
  { id: 'BOLD', label: 'Bold', color: '#dc2626' },
  { id: 'CREATIVE', label: 'Creative', color: '#7c3aed' },
  { id: 'CORPORATE', label: 'Corporate', color: '#0284c7' },
]

const PRESET_COLORS = [
  '#0ea5e9',
  '#0f172a',
  '#dc2626',
  '#7c3aed',
  '#16a34a',
  '#d97706',
  '#db2777',
  '#0284c7',
]

interface SocialLink {
  id: string
  platform: string
  url: string
  displayOrder: number
}

interface CardDetail {
  id: string
  handle: string
  templateId: Template
  isActive: boolean
  fields?: {
    name?: string
    title?: string
    company?: string
    bio?: string
    email?: string
    phone?: string
    website?: string
    avatarUrl?: string
  }
  theme?: {
    primaryColor?: string
  }
  socialLinks?: SocialLink[]
}

type Tab = 'profile' | 'links' | 'theme'

export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile fields
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)

  // Links tab
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([])

  // Theme tab
  const [template, setTemplate] = useState<Template>('MINIMAL')
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9')

  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoad = useRef(true)

  // Load card data
  useEffect(() => {
    if (!id) return
    void api
      .getCard(id)
      .then((data) => {
        const card = data as CardDetail
        setName(card.fields?.name ?? '')
        setTagline(card.fields?.title ?? '')
        setBio(card.fields?.bio ?? '')
        setPhone(card.fields?.phone ?? '')
        setEmail(card.fields?.email ?? '')
        setWebsite(card.fields?.website ?? '')
        setTemplate(card.templateId ?? 'MINIMAL')
        setPrimaryColor(card.theme?.primaryColor ?? '#0ea5e9')
        setSocialLinks((card.socialLinks ?? []).map((l) => ({ platform: l.platform, url: l.url })))
        setLoading(false)
        // Mark initial load done after state settles
        setTimeout(() => {
          isInitialLoad.current = false
        }, 100)
      })
      .catch(() => setLoading(false))
  }, [id])

  // Auto-save debounced
  const triggerAutoSave = useCallback(() => {
    if (isInitialLoad.current || !id) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await updateCard(id, {
          templateId: template,
          fields: { name, title: tagline, bio, phone, email, website },
        })
      } catch {
        // Silent auto-save failure
      } finally {
        setSaving(false)
      }
    }, 1500)
  }, [id, name, tagline, bio, phone, email, website, template])

  useEffect(() => {
    triggerAutoSave()
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [triggerAutoSave])

  // Header "Done" button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Edit Card',
      headerRight: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#0ea5e9', fontSize: 16, fontWeight: '600' }}>Done</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation, router])

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.')
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
      if (id && asset.base64) {
        try {
          await uploadAvatar(id, asset.base64, asset.mimeType ?? 'image/jpeg')
        } catch {
          Alert.alert('Upload failed', 'Could not upload avatar. Changes saved locally.')
        }
      }
    }
  }

  function addSocialLink() {
    setSocialLinks([...socialLinks, { platform: 'LINKEDIN', url: '' }])
  }

  function removeSocialLink(index: number) {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  function updateSocialLink(index: number, field: 'platform' | 'url', value: string) {
    const updated = socialLinks.map((link, i) => {
      if (i !== index) return link
      return { platform: link.platform, url: link.url, [field]: value }
    })
    setSocialLinks(updated)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    )
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  }

  const labelStyle = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 6,
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Auto-save indicator */}
        {saving && (
          <View style={{ backgroundColor: '#f0fdf4', paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ color: '#16a34a', fontSize: 12 }}>Saving…</Text>
          </View>
        )}

        {/* Tab bar */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          }}
        >
          {(['profile', 'links', 'theme'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? '#0ea5e9' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: activeTab === tab ? '#0ea5e9' : '#94a3b8',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <View style={{ gap: 16 }}>
              {/* Avatar */}
              <View style={{ alignItems: 'center', marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => void pickAvatar()}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#e2e8f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#0ea5e9',
                    borderStyle: 'dashed',
                  }}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Feather
                      name={avatarBase64 ? 'check-circle' : 'camera'}
                      size={18}
                      color={avatarBase64 ? '#0ea5e9' : '#64748b'}
                    />
                    <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                      {avatarBase64 ? 'Updated' : 'Change\nPhoto'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={labelStyle}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Jane Doe"
                  placeholderTextColor="#9ca3af"
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={labelStyle}>Tagline / Title</Text>
                <TextInput
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Software Engineer"
                  placeholderTextColor="#9ca3af"
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={labelStyle}>Bio</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell people about yourself..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }}
                />
              </View>
              <View>
                <Text style={labelStyle}>Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={labelStyle}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="jane@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={labelStyle}>Website</Text>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://janedoe.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="url"
                  autoCapitalize="none"
                  style={inputStyle}
                />
              </View>
            </View>
          )}

          {/* ── Links Tab ── */}
          {activeTab === 'links' && (
            <View style={{ gap: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>
                Add your social media links.
              </Text>
              {socialLinks.map((link, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={link.platform}
                      onChangeText={(v) => updateSocialLink(index, 'platform', v.toUpperCase())}
                      placeholder="LINKEDIN"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="characters"
                      style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                    />
                    <TouchableOpacity
                      onPress={() => removeSocialLink(index)}
                      style={{
                        backgroundColor: '#fee2e2',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather name="x" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={link.url}
                    onChangeText={(v) => updateSocialLink(index, 'url', v)}
                    placeholder="https://linkedin.com/in/..."
                    placeholderTextColor="#9ca3af"
                    keyboardType="url"
                    autoCapitalize="none"
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </View>
              ))}
              <TouchableOpacity
                onPress={addSocialLink}
                style={{
                  borderWidth: 1,
                  borderColor: '#0ea5e9',
                  borderStyle: 'dashed',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>
                  + Add Social Link
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Theme Tab ── */}
          {activeTab === 'theme' && (
            <View style={{ gap: 20 }}>
              {/* Template picker */}
              <View>
                <Text style={{ ...labelStyle, fontSize: 15, marginBottom: 12 }}>Template</Text>
                <View style={{ gap: 10 }}>
                  {TEMPLATES.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setTemplate(t.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: template === t.id ? t.color : '#e2e8f0',
                        backgroundColor: template === t.id ? `${t.color}12` : '#ffffff',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          backgroundColor: t.color,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 11 }}>
                          {t.label[0]}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: '600', color: '#0f172a', fontSize: 14, flex: 1 }}>
                        {t.label}
                      </Text>
                      {template === t.id && (
                        <Feather name="check-circle" size={16} color={t.color} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color picker */}
              <View>
                <Text style={{ ...labelStyle, fontSize: 15, marginBottom: 12 }}>Primary Color</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setPrimaryColor(color)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: color,
                        borderWidth: primaryColor === color ? 3 : 0,
                        borderColor: '#ffffff',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    />
                  ))}
                </View>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: primaryColor,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                    }}
                  />
                  <TextInput
                    value={primaryColor}
                    onChangeText={(v) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v)
                    }}
                    placeholder="#0ea5e9"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
