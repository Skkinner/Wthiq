import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Hardcoded fallbacks for doc-tracker-new project (npesyttvanpuoisbebbj)
// These are used when env vars are not available in v0 preview
const FALLBACK_URL = "https://npesyttvanpuoisbebbj.supabase.co"
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZXN5dHR2YW5wdW9pc2JlYmJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTI0MjgsImV4cCI6MjA5NDI2ODQyOH0.yI6QXIurQCXbw1nMyRY1WbAabDlS8ETOGnQsu-49IS8"

// Get URL from env vars with fallback
function getUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
}

// Get anon key from env vars with fallback
function getAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY
}

// Get service role key from env vars (no fallback for security - use anon key if not set)
function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || getAnonKey()
}

export async function createClient() {
  const url = getUrl()
  const anonKey = getAnonKey()
  
  if (!url || !anonKey) {
    throw new Error(
      `Supabase environment variables are missing. URL: ${url ? "set" : "missing"}, Key: ${anonKey ? "set" : "missing"}`
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Can be ignored if you have middleware refreshing sessions
        }
      },
    },
  })
}

// Service role client for API routes (bypasses RLS)
export function createServiceClient() {
  const url = getUrl()
  const key = getServiceKey()

  if (!url || !key) {
    throw new Error(
      `Supabase environment variables are missing. URL: ${url ? "set" : "missing"}, Key: ${key ? "set" : "missing"}`
    )
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
