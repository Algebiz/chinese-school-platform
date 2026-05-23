import { createClient } from '@supabase/supabase-js'

// Factory functions — instantiated on first use, not at module load time.
// This prevents build-time errors when env vars are not yet set.

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin env vars not configured')
  return createClient(url, key)
}

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase client env vars not configured')
  return createClient(url, key)
}
