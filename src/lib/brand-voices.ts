import { getSupabaseClient } from "@/lib/supabase";
import type { BrandVoice } from "@/lib/types";

export async function getBrandVoices(): Promise<BrandVoice[]> {
  const { data, error } = await getSupabaseClient()
    .from("brand_voices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BrandVoice[];
}

// Safe variant for the generator form: returns [] instead of throwing when the
// table doesn't exist yet, so the page still renders (with a tone-only form).
export async function getBrandVoicesSafe(): Promise<BrandVoice[]> {
  try {
    return await getBrandVoices();
  } catch {
    return [];
  }
}

export async function getBrandVoiceById(id: string): Promise<BrandVoice | null> {
  const { data, error } = await getSupabaseClient()
    .from("brand_voices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BrandVoice | null;
}
