import { createClient } from "@/lib/supabase/server"
import { toCamelCase, isValidUUID } from "@/lib/supabase/utils"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("users").select("*")

    if (error) {
      console.error("[API] Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = data?.map(toCamelCase) || []
    console.log(`[API] Fetched ${users.length} users`)
    return NextResponse.json({ data: users })
  } catch (error: any) {
    console.error("[API] Exception in GET /api/users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const users = Array.isArray(body) ? body : [body]

    const validUsers = users.filter((user) => isValidUUID(user.id))
    if (validUsers.length === 0) {
      return NextResponse.json({ error: "No valid users to save" }, { status: 400 })
    }

    const dbUsers = validUsers.map((user) => ({
      id: user.id,
      email: user.email,
      password: user.password, // Now saving password
      role: user.role,
      name: user.name,
      name_en: user.nameEn,
      phone: user.phone,
      password_history: user.passwordHistory || [], // Now saving password history
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }))

    const supabase = await createClient()
    const { data, error } = await supabase.from("users").upsert(dbUsers).select()

    if (error) {
      console.error("[API] Error saving users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Saved ${data?.length || 0} users`)
    return NextResponse.json({ data: data?.map(toCamelCase) || [] })
  } catch (error: any) {
    console.error("[API] Exception in POST /api/users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from("users").delete().eq("id", id)

    if (error) {
      console.error("[API] Error deleting user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Deleted user ${id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Exception in DELETE /api/users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
