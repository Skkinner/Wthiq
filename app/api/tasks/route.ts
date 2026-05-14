import { createClient } from "@/lib/supabase/server"
import { toCamelCase, isValidUUID } from "@/lib/supabase/utils"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("tasks").select("*")

    if (error) {
      console.error("[API] Error fetching tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tasks = data?.map(toCamelCase) || []
    console.log(`[API] Fetched ${tasks.length} tasks`)
    return NextResponse.json({ data: tasks })
  } catch (error: any) {
    console.error("[API] Exception in GET /api/tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const tasks = Array.isArray(body) ? body : [body]

    const validTasks = tasks.filter((task) => isValidUUID(task.id) && isValidUUID(task.assignedToId))
    if (validTasks.length === 0) {
      return NextResponse.json({ error: "No valid tasks to save" }, { status: 400 })
    }

    const dbTasks = validTasks.map((task) => ({
      id: task.id,
      task_label: task.taskLabel,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to_id: task.assignedToId,
      receipt_date: task.receiptDate,
      deadline: task.deadline,
      actual_delivery_date: task.actualDeliveryDate,
      notes: task.notes,
      updates: task.updates,
      created_by_id: isValidUUID(task.createdById) ? task.createdById : null,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    }))

    const supabase = await createClient()
    const { data, error } = await supabase.from("tasks").upsert(dbTasks).select()

    if (error) {
      console.error("[API] Error saving tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Saved ${data?.length || 0} tasks`)
    return NextResponse.json({ data: data?.map(toCamelCase) || [] })
  } catch (error: any) {
    console.error("[API] Exception in POST /api/tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      console.error("[API] Error deleting task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] Deleted task ${id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Exception in DELETE /api/tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
