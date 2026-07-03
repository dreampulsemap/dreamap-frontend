import { createClient } from '@supabase/supabase-js'

// GEÇİCİ: Hardcoded değerler (test için)
// NOT: Production'da environment variables kullanılmalı!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhtoezrhvipiketlelqh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodG9lenJodmlwaWtldGxlbHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk5NzQ0MDAsImV4cCI6MjAzNTU1MDQwMH0.placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
