import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://ghnpzllykteelveezhnv.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnB6bGx5a3RlZWx2ZWV6aG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTM1MzksImV4cCI6MjA4MzM4OTUzOX0.GcYr_4IdJSnb1Nm5btugDPZq9MzV61nrSuOKNsbPAoo'

function isValidUrl(str) {
  try { return /^https?:\/\//.test(str) && Boolean(new URL(str)); }
  catch { return false; }
}

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = isValidUrl(envUrl) ? envUrl : FALLBACK_URL
const supabaseAnonKey = (envKey && envKey.length > 20) ? envKey : FALLBACK_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
