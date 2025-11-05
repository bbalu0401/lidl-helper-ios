import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Egyszerű auth helper
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) console.error("Auth error:", error)
  return data?.user
}
