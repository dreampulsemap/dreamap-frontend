import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ALLOWED_LANGUAGES = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja'] // YENİ
const ALLOWED_GENDERS = ['female', 'male', 'unspecified']                  // YENİ

function normalize(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, username, display_name, avatar_url, is_private, language, gender } = req.body || {}

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const cleanUsername = normalize(username)
    const cleanDisplayName = normalize(display_name)
    const cleanAvatarUrl = normalize(avatar_url)
    const cleanLanguage = normalize(language)   // YENİ
    const cleanGender = normalize(gender)       // YENİ

    if (cleanUsername && cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }
    if (cleanUsername && cleanUsername.length > 32) {
      return res.status(400).json({ error: 'Username must be at most 32 characters' })
    }
    if (cleanDisplayName && cleanDisplayName.length > 60) {
      return res.status(400).json({ error: 'Display name is too long' })
    }
    if (cleanAvatarUrl) {
      try { new URL(cleanAvatarUrl) } catch {
        return res.status(400).json({ error: 'Avatar URL is not valid' })
      }
    }
    // YENİ: dil/cinsiyet doğrulaması (DB check constraint'leriyle birebir)
    if (cleanLanguage && !ALLOWED_LANGUAGES.includes(cleanLanguage)) {
      return res.status(400).json({ error: 'Invalid language' })
    }
    if (cleanGender && !ALLOWED_GENDERS.includes(cleanGender)) {
      return res.status(400).json({ error: 'Invalid gender' })
    }

    if (cleanUsername) {
      const { data: existingUser, error: usernameCheckError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', cleanUsername)
        .neq('id', userId)
        .maybeSingle()

      if (usernameCheckError) {
        return res.status(500).json({ error: usernameCheckError.message })
      }
      if (existingUser) {
        return res.status(409).json({ error: 'This username is already in use' })
      }
    }

    const updates = { updated_at: new Date().toISOString() }

    if (cleanUsername !== null) updates.username = cleanUsername
    if (cleanDisplayName !== null) updates.display_name = cleanDisplayName
    if (cleanAvatarUrl !== null) updates.avatar_url = cleanAvatarUrl
    if (typeof is_private === 'boolean') updates.is_private = is_private
    if (cleanLanguage !== null) updates.language = cleanLanguage // YENİ
    if (cleanGender !== null) updates.gender = cleanGender       // YENİ

    // NOT: public.user_profiles satırı, auth.users'a INSERT olunca
    // on_auth_user_created trigger'ı (handle_new_user()) tarafından
    // otomatik oluşturuluyor, bu yüzden .update() güvenle kullanılabilir.
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    if (!data) {
      return res.status(404).json({ error: 'Profile not found in user_profiles' })
    }

    return res.status(200).json({ success: true, profile: data })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected server error' })
  }
}
