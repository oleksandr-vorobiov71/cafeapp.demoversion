import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Supabase-Konfiguration fehlt: VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY ' +
    '(.env lokal bzw. Environment variables in Netlify).'
  )
}

// Eine gemeinsame Instanz für Gäste-Menü und Admin.
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})
