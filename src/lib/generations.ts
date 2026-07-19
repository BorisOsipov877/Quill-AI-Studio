import { getSupabaseClient } from "@/lib/supabase";
import type { ContentGeneration } from "@/lib/types";

export async function getRecentGenerations(limit = 30): Promise<ContentGeneration[]> {
  const { data, error } = await getSupabaseClient()
    .from("content_generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ContentGeneration[];
}

/**
 * Row count for the History badge. Returns 0 rather than throwing — this runs
 * in the root layout, so a missing table must never break every page.
 */
export async function getGenerationsCountSafe(): Promise<number> {
  try {
    const { count, error } = await getSupabaseClient()
      .from("content_generations")
      .select("id", { count: "exact", head: true });

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getGenerationById(id: string): Promise<ContentGeneration | null> {
  const { data, error } = await getSupabaseClient()
    .from("content_generations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ContentGeneration | null;
}
