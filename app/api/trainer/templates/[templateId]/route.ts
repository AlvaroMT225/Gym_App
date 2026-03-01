import { NextRequest, NextResponse } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, validateBody } from "@/lib/api-utils";
import { templateBodySchema } from "@/lib/validations/trainer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"]);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const trainerId = sessionOrResponse.userId;

    const { templateId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("templates")
      .select("*, template_exercises(*, exercises(name))")
      .eq("id", templateId)
      .eq("coach_id", trainerId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    const template = {
      id: data.id,
      title: data.name,
      description: data.description,
      type: Array.isArray(data.muscle_groups) ? data.muscle_groups.join(", ") : data.muscle_groups,
      exercises: (data.template_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => {
          const exerciseData = Array.isArray(e.exercises) ? e.exercises[0] : e.exercises;
          return {
            exerciseId: e.exercise_id,
            sets: e.sets_target,
            reps: e.reps_target,
            exerciseName: exerciseData?.name || e.exercise_id,
          };
        }),
    };

    return NextResponse.json({ template });
  } catch (err) {
    console.error("Error fetching template:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"]);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const trainerId = sessionOrResponse.userId;

    const { templateId } = await params;
    const { title, description, type, exercises } = await validateBody(request, templateBodySchema);

    const supabase = await createClient();

    const { data: updatedTemplate, error: updateError } = await supabase
      .from("templates")
      .update({
        name: title,
        description: description || "",
        muscle_groups: [type],
      })
      .eq("id", templateId)
      .eq("coach_id", trainerId)
      .select("id")
      .single();

    if (updateError) {
      console.error("Error updating template:", updateError);
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: "Plantilla no encontrada o sin permisos para editar" }, { status: 404 });
      }
      throw updateError;
    }

    const { error: deleteError } = await supabase
      .from("template_exercises")
      .delete()
      .eq("template_id", templateId);

    if (deleteError) {
      console.error("Error deleting old exercises:", deleteError);
      throw deleteError;
    }

    if (exercises.length > 0) {
      const exercisesToInsert = exercises.map((ex: any, index: number) => ({
        template_id: templateId,
        exercise_id: ex.exerciseId,
        order_index: index,
        sets_target: ex.sets,
        reps_target: ex.reps,
      }));

      const { error: insertError } = await supabase
        .from("template_exercises")
        .insert(exercisesToInsert);

      if (insertError) {
        console.error("Error inserting new exercises:", insertError);
        throw insertError;
      }
    }

    return NextResponse.json({ template: { id: updatedTemplate.id, title, description, type, exercises } });
  } catch (err) {
    console.error("Error updating template:", err);
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"]);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const trainerId = sessionOrResponse.userId;

    const { templateId } = await params;
    const supabase = await createClient();

    const { error, count } = await supabase
      .from("templates")
      .delete({ count: 'exact' })
      .eq("id", templateId)
      .eq("coach_id", trainerId);

    if (error) {
      console.error("Error deleting template:", error);
      throw error;
    }

    if (count === 0) {
      return NextResponse.json({ error: "Plantilla no encontrada o sin permisos para eliminar" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting template:", err);
    return handleApiError(err);
  }
}