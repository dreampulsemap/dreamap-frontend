import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL tanımlı değil')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

function sanitizeUsername(value) {
  if (!value || typeof value !== 'string') return 'dreamer'

  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24)

  return cleaned || 'dreamer'
}

function deriveUsername(user, fallbackEmail = '') {
  const metaUsername =
    user?.user_metadata?.username ||
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.name

  const emailBase = fallbackEmail
    ? fallbackEmail.split('@')[0]
    : user?.email
    ? user.email.split('@')[0]
    : 'dreamer'

  return sanitizeUsername(metaUsername || emailBase)
}

function buildProfilePayload(user, overrides = {}) {
  const now = new Date().toISOString()

  return {
    id: user.id,
    email: user.email || null, // <--- KRİTİK EKLENTİ: E-POSTA ARTIK VERİTABANINA YAZILIYOR
    username: overrides.username || deriveUsername(user),
    display_name:
      overrides.display_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      null,
    avatar_url:
      overrides.avatar_url ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      null,
    updated_at: now,
    ...(overrides.includeCreatedAt ? { created_at: now } : {}),
  }
}

export const auth = {
  async signUp(email, password, username) {
    const safeUsername = sanitizeUsername(username || email.split('@')[0])

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: safeUsername,
        },
      },
    })

    if (error) throw error

    if (data?.user) {
      await this.ensureProfile(data.user, {
        username: safeUsername,
      })
    }

    return data
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    if (data?.user) {
      await this.ensureProfile(data.user)
    }

    return data
  },

  async signInWithOAuth(provider, redirectTo) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          redirectTo ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined),
      },
    })

    if (error) throw error
    return data
  },

  async exchangeCodeForSession(code) {
    if (!code) {
      throw new Error('OAuth code eksik')
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) throw error

    if (data?.user) {
      await this.ensureProfile(data.user)
    }

    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return null
    return data.user
  },

  async getProfile(userId) {
    if (!userId) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Profil alınamadı:', error.message)
      return null
    }

    return data || null
  },

  async ensureProfile(user, overrides = {}) {
    if (!user?.id) return null

    const payload = buildProfilePayload(user, {
      ...overrides,
      includeCreatedAt: true,
    })

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Profil oluşturulamadı/güncellenemedi:', error.message)
      return null
    }

    return data || null
  },

  async updateProfile(userId, updates = {}) {
    if (!userId) throw new Error('userId gerekli')

    const payload = {
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },

  async refreshProfile() {
    const user = await this.getUser()
    if (!user) return null
    return this.ensureProfile(user)
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },
}