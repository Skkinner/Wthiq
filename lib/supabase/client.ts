import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Creates a Supabase client for browser-side operations.
 * NOTE: In v0 preview, NEXT_PUBLIC_* env vars may not be available.
 * Use API routes (/api/data/[table]) for data operations instead.
 * This client is only used for realtime subscriptions (when available).
 */
export function createClient() {
  // Return cached instance if available
  if (clientInstance) {
    return clientInstance
  }
  
  // Don't create client on server side
  if (typeof window === "undefined") {
    throw new Error("createClient should only be called on the client side")
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error(
      "Supabase client-side credentials not available. " +
      "Data operations should use API routes (/api/data/[table]) instead."
    )
  }
  
  clientInstance = createBrowserClient(url, key)
  return clientInstance
}

// Lazy getter - only creates client when accessed
export const getSupabase = () => createClient()

// Named export for backwards compatibility
// Note: This will throw an error if called before env vars are available
// Prefer using API routes for data operations in v0 preview
export const supabase = {
  from: (table: string) => createClient().from(table),
  auth: { getUser: () => createClient().auth.getUser() },
  channel: (name: string) => createClient().channel(name),
  removeChannel: (channel: any) => createClient().removeChannel(channel),
}
