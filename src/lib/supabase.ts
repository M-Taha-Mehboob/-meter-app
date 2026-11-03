import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured: copy .env.example to .env.local and fill in the keys.')
}

// Supabase email links (invite, password reset) land on the app with "#...&type=invite" or
// "#error_description=..." in the URL. Read it before the client consumes and clears the hash.
const linkParams = (() => {
  try {
    return new URLSearchParams(window.location.hash.slice(1))
  } catch {
    return new URLSearchParams()
  }
})()

/** "invite" or "recovery" when the page was opened from such an email link, else null. */
export const emailLinkType = linkParams.get('type')

/** Why an email link failed (e.g. it expired), else null. */
export const emailLinkError = linkParams.get('error_description')

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
