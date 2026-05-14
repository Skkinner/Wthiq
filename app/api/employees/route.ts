import { createClient } from "@/lib/supabase/server"
import { toCamelCase, isValidUUID } from "@/lib/supabase/utils"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("employees").select("*")

    if (error) {
      console.error("[API] Error fetching employees:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const employees = data?.map(toCamelCase) || []
    console.log(`[API] Fetched ${employees.length} employees`)
    return NextResponse.json({ data: employees })
  } catch (error: any) {
    console.error("[API] Exception in GET /api/employees:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const employees = Array.isArray(body) ? body : [body]

    const validEmployees = employees.filter((emp) => isValidUUID(emp.id))
    if (validEmployees.length === 0) {
      return NextResponse.json({ error: "No valid employees to save" }, { status: 400 })
    }

    const dbEmployees = validEmployees.map((emp) => ({
      id: emp.id,
      employee_number: emp.employeeNumber,
      name_ar: emp.nameAr,
      name_en: emp.nameEn,
      national_id: emp.nationalId,
      nationality: emp.nationality,
      phone: emp.phone,
      email: emp.email,
      department: emp.department,
      position: emp.position,
      is_active: emp.isActive,
      created_at: emp.createdAt,
      updated_at: emp.updatedAt,
    }))

    const supabase = await createClient()
    const { data, error } = await supabase.from("employees").upsert(dbEmployees).select()

    if (error) {
      console.error("[API] Error saving employees:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Saved ${data?.length || 0} employees`)
    return NextResponse.json({ data: data?.map(toCamelCase) || [] })
  } catch (error: any) {
    console.error("[API] Exception in POST /api/employees:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from("employees").delete().eq("id", id)

    if (error) {
      console.error("[API] Error deleting employee:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Deleted employee ${id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Exception in DELETE /api/employees:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
