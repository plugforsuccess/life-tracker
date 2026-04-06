import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ghnpzllykteelveezhnv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnB6bGx5a3RlZWx2ZWV6aG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTM1MzksImV4cCI6MjA4MzM4OTUzOX0.GcYr_4IdJSnb1Nm5btugDPZq9MzV61nrSuOKNsbPAoo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
