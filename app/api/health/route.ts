import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    // Get env vars directly
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Test database connection
    let dbConnection = { status: "untested", error: null as string | null }
    if (url && anonKey) {
      try {
        const supabase = createServiceClient()
        const { error } = await supabase.from("users").select("id").limit(1)
        dbConnection = error 
          ? { status: "error", error: error.message }
          : { status: "connected", error: null }
      } catch (e: any) {
        dbConnection = { status: "error", error: e.message }
      }
    } else {
      dbConnection = { status: "not_configured", error: "Missing URL or key" }
    }
    
    return NextResponse.json({
      status: dbConnection.status === "connected" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      supabase: {
        urlConfigured: !!url,
        anonKeyConfigured: !!anonKey,
        serviceKeyConfigured: !!serviceKey,
      },
      database: dbConnection,
      envVars: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
    }, { status: 500 })
  }
}
