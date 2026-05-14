"use client"

import { useEffect } from "react"

// Realtime sync is disabled in v0 preview due to env var limitations
// This hook is a no-op but maintains the interface for future use
export function useRealtimeSync(table: string, onUpdate: () => void) {
  useEffect(() => {
    // Realtime subscriptions require client-side Supabase access
    // which is not available in v0 preview environment
    // The app still works via API routes for data operations
    console.log(`[Realtime] Realtime sync disabled for ${table} in preview environment`)
  }, [table, onUpdate])
}
