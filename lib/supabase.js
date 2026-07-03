import { createClient } from '@supabase/supabase-js'

// GEÇİCİ: Hardcoded değerler (test için)
// NOT: Production'da environment variables kullanılmalı!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhtoezrhvipiketlelqh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Pm9O8xgmYcBhvQR0_2QQ3g_cmekoTMN'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
