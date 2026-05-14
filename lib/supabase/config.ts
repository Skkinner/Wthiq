// Supabase configuration
// Server-side env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Client-side env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseConfig() {
  // Server-side variables take priority, then fall back to NEXT_PUBLIC_ versions
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  return {
    url,
    anonKey,
    serviceRoleKey: serviceRoleKey || anonKey, // Fall back to anon key if no service key
  }
}
