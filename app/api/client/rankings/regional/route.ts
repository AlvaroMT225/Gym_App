import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Trend = "up" | "down" | "stable";

interface RegionalRankingRow {
  athleteId: string;
  rankPosition: number;
  previousRank: number | null;
  finalScore: number;
}

interface ProfileRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseRegionalRankingRow(value: unknown): RegionalRankingRow | null {
  if (!isRecord(value)) return null;

  const athleteId = readString(value.athlete_id);
  const rankPosition = readNullableNumber(value.rank_position);
  if (!athleteId || rankPosition === null) return null;

  return {
    athleteId,
    rankPosition,
    previousRank: readNullableNumber(value.previous_rank),
    finalScore: readNumber(value.final_score),
  };
}

function parseProfileRow(value: unknown): ProfileRow | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  if (!id) return null;
  return {
    id,
    firstName: readNullableString(value.first_name),
    lastName: readNullableString(value.last_name),
  };
}

function computeTrend(rankPosition: number, previousRank: number | null): Trend {
  if (previousRank === null) return "stable";
  if (rankPosition < previousRank) return "up";
  if (rankPosition > previousRank) return "down";
  return "stable";
}

function buildName(profile: ProfileRow | undefined): string {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return name || "Atleta";
}

function buildAvatar(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return first || "?";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.gym_id) {
      return NextResponse.json(
        { error: "User profile or gym not found" },
        { status: 404 }
      );
    }
    const { gym_id } = profile;

    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region");

    if (!region || (region !== "upper" && region !== "lower")) {
      return NextResponse.json(
        {
          error:
            "Invalid or missing 'region' query parameter. Must be 'upper' or 'lower'.",
        },
        { status: 400 }
      );
    }

    const { data: rankings, error } = await adminSupabase
      .from("regional_rankings")
      .select("athlete_id, rank_position, previous_rank, final_score")
      .eq("gym_id", gym_id)
      .eq("region", region)
      .order("rank_position", { ascending: true });

    if (error) throw error;

    const parsedRankings = (Array.isArray(rankings) ? rankings : [])
      .map((row) => parseRegionalRankingRow(row))
      .filter((row): row is RegionalRankingRow => row !== null);

    if (parsedRankings.length === 0) {
      return NextResponse.json({ rankings: [] });
    }

    const athleteIds = parsedRankings.map((entry) => entry.athleteId);
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", athleteIds)
      .eq("gym_id", gym_id);

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, ProfileRow>(
      (Array.isArray(profiles) ? profiles : [])
        .map((profile) => parseProfileRow(profile))
        .filter((profile): profile is ProfileRow => profile !== null)
        .map((profile) => [profile.id, profile])
    );

    const formattedRankings = parsedRankings.map((entry) => {
      const name = buildName(profileMap.get(entry.athleteId));
      return {
        athlete_id: entry.athleteId,
        name,
        avatar: buildAvatar(name),
        rank_position: entry.rankPosition,
        previous_rank: entry.previousRank,
        trend: computeTrend(entry.rankPosition, entry.previousRank),
        final_score: entry.finalScore,
        isUser: entry.athleteId === user.id,
      };
    });

    return NextResponse.json({ rankings: formattedRankings });
  } catch (error: unknown) {
    console.error("Error in /api/client/rankings/regional:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
