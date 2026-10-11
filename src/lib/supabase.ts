import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

const isUsableUrl = Boolean(url && /^https?:\/\//.test(url) && !url.includes('your-project-ref'))
const isUsableKey = Boolean(publishableKey && !publishableKey.includes('your-supabase-publishable-key'))
export const isSupabaseConfigured = Boolean(isUsableUrl && isUsableKey)
export const supabase: SupabaseClient | null = isSupabaseConfigured && url && publishableKey
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
