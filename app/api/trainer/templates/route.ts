import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, paginationParams, validateBody } from "@/lib/api-utils"
import { templateBodySchema } from "@/lib/validations/trainer"

export async function GET(request: NextRequest) {
  try {
    const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
    
    // Corrección: Usar userId directamente como dicta tu GuardResult
    const trainerId = sessionOrResponse.userId

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data, count, error } = await supabase
      .from("templates")
      .select("*, template_exercises(*, exercises(name))", { count: "exact", head: false })
      .eq("coach_id", trainerId)
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching templates:", error)
      throw error
    }

    const enriched = (data || []).map((t: any) => ({
      id: t.id,
      title: t.name,
      description: t.description,
      type: Array.isArray(t.muscle_groups) ? t.muscle_groups.join(", ") : t.muscle_groups,
      exercises: (t.template_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index) // Ordenamiento seguro en memoria
        .map((e: any) => {
          // Normalización por si Supabase retorna el join como array u objeto
          const exerciseData = Array.isArray(e.exercises) ? e.exercises[0] : e.exercises;
          return {
            exerciseId: e.exercise_id,
            sets: e.sets_target,
            reps: e.reps_target,
            exerciseName: exerciseData?.name || e.exercise_id,
          }
        }),
    }))

    return NextResponse.json(
      { templates: enriched, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
    
    // Corrección: Usar userId
    const trainerId = sessionOrResponse.userId

    const { title, description, type, exercises } = await validateBody(request, templateBodySchema)

    const supabase = await createClient()

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .insert({
        coach_id: trainerId,
        name: title,
        description: description || "",
        muscle_groups: [type],
      })
      .select("id")
      .single()

    if (templateError) {
      console.error("Error creating template:", templateError)
      throw templateError
    }

    const exercisesToInsert = exercises.map((ex: any, index: number) => ({
      template_id: template.id,
      exercise_id: ex.exerciseId,
      order_index: index,
      sets_target: ex.sets,
      reps_target: ex.reps,
    }))

    const { error: exercisesError } = await supabase.from("template_exercises").insert(exercisesToInsert)

    if (exercisesError) {
      console.error("Error inserting template exercises:", exercisesError)
      throw exercisesError
    }

    return NextResponse.json({ template: { id: template.id, title, description, type, exercises } }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
