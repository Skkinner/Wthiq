import { createClient } from "@/lib/supabase/server"
import { toCamelCase, isValidUUID } from "@/lib/supabase/utils"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("documents").select("*")

    if (error) {
      console.error("[API] Error fetching documents:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const documents = data?.map(toCamelCase) || []
    console.log(`[API] Fetched ${documents.length} documents`)
    return NextResponse.json({ data: documents })
  } catch (error: any) {
    console.error("[API] Exception in GET /api/documents:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const documents = Array.isArray(body) ? body : [body]

    const validDocuments = documents.filter((doc) => isValidUUID(doc.id) && isValidUUID(doc.employeeId))
    if (validDocuments.length === 0) {
      return NextResponse.json({ error: "No valid documents to save" }, { status: 400 })
    }

    const dbDocuments = validDocuments.map((doc) => ({
      id: doc.id,
      employee_id: doc.employeeId,
      document_type: doc.documentType,
      document_number: doc.documentNumber,
      issue_date: doc.issueDate,
      expiry_date: doc.expiryDate,
      reminder_days: doc.reminderDays,
      attachment_url: doc.attachmentUrl,
      attachment_name: doc.attachmentName,
      notes: doc.notes,
      status: doc.status,
      passport_location: doc.passportLocation,
      visa_type: doc.visaType,
      responsible_authority: doc.responsibleAuthority,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      created_by: isValidUUID(doc.createdBy) ? doc.createdBy : null,
    }))

    const supabase = await createClient()
    const { data, error } = await supabase.from("documents").upsert(dbDocuments).select()

    if (error) {
      console.error("[API] Error saving documents:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Saved ${data?.length || 0} documents`)
    return NextResponse.json({ data: data?.map(toCamelCase) || [] })
  } catch (error: any) {
    console.error("[API] Exception in POST /api/documents:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from("documents").delete().eq("id", id)

    if (error) {
      console.error("[API] Error deleting document:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Deleted document ${id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Exception in DELETE /api/documents:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
