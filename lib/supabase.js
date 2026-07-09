import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth fonksiyonları
export const auth = {
  // Kayıt ol
  async signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        }
      }
    })
    
    if (error) throw error
    
    // Username'i user_profiles tablosuna güvenli şekilde kaydet (veya güncelle)
    if (data?.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({ 
          id: data.user.id, // Primary key
          username: username || email.split('@')[0],
          updated_at: new Date()
        })
      
      if (profileError) console.error("Profil tablosu güncellenemedi:", profileError.message)
    }
    
    return data
  },

  // Giriş yap
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  // Çıkış yap
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Mevcut kullanıcı (Çökmeyi önleyen güvenli yaklaşım)
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data) return null
    return data.user
  },

  // Kullanıcı profili
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // Profil güncelle
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}
