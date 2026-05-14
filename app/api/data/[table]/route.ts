import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

// Convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// Convert object keys from snake_case to camelCase
function convertToCamelCase(obj: Record<string, any>): Record<string, any> {
  const converted: Record<string, any> = {}
  for (const key in obj) {
    converted[snakeToCamel(key)] = obj[key]
  }
  return converted
}

// Convert object keys from camelCase to snake_case
function convertToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const converted: Record<string, any> = {}
  for (const key in obj) {
    converted[camelToSnake(key)] = obj[key]
  }
  return converted
}

// Allowed tables
const ALLOWED_TABLES = ["users", "employees", "documents", "tasks", "notifications", "audit_logs", "settings"]

// GET - Fetch all records from a table
export async function GET(request: Request, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase.from(table).select("*")

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    // Convert snake_case to camelCase
    const convertedData = (data || []).map(convertToCamelCase)
    return NextResponse.json(convertedData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Upsert records to a table
export async function POST(request: Request, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const body = await request.json()
    const records = Array.isArray(body) ? body : [body]

    // Convert camelCase to snake_case
    const convertedRecords = records.map(convertToSnakeCase)

    const supabase = createServiceClient()
    const { data, error } = await supabase.from(table).upsert(convertedRecords, { onConflict: "id" })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a record from a table
export async function DELETE(request: Request, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from(table).delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
