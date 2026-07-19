"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase";

export interface BrandVoiceInput {
  name: string;
  description: string;
  examplePhrases: string; // raw textarea (newline / comma separated)
  avoidWords: string; // raw textarea (newline / comma separated)
}

export type BrandVoiceResult = { ok: true } | { ok: false; error: string };

// Split a textarea value (newlines / commas / semicolons / bullets) into a
// clean list, stripping leading list markers.
function toList(raw: string): string[] {
  return (raw ?? "")
    .split(/[\n,;•]+/)
    .map((s) => s.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export async function createBrandVoiceAction(input: BrandVoiceInput): Promise<BrandVoiceResult> {
  const name = input.name?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const examplePhrases = toList(input.examplePhrases).slice(0, 10);
  const avoidWords = toList(input.avoidWords).slice(0, 30);

  if (!name) return { ok: false, error: "Please give the voice a name." };
  if (!description) return { ok: false, error: "Please describe the style of this voice." };
  if (examplePhrases.length < 3) {
    return { ok: false, error: "Add at least 3 example phrases or words." };
  }

  try {
    const { error } = await getSupabaseAdminClient().from("brand_voices").insert({
      name,
      description,
      example_phrases: examplePhrases,
      avoid_words: avoidWords,
    });
    if (error) {
      if (/relation .*brand_voices.* does not exist/i.test(error.message)) {
        return {
          ok: false,
          error: "The brand_voices table doesn't exist yet. Run supabase/schema.sql first.",
        };
      }
      return { ok: false, error: "Couldn't save the voice. Please try again." };
    }
  } catch {
    return { ok: false, error: "Couldn't save the voice. Please try again." };
  }

  revalidatePath("/brand-voice");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBrandVoiceAction(id: string): Promise<BrandVoiceResult> {
  if (!id) return { ok: false, error: "Missing voice id." };
  try {
    const { error } = await getSupabaseAdminClient().from("brand_voices").delete().eq("id", id);
    if (error) return { ok: false, error: "Couldn't delete the voice. Please try again." };
  } catch {
    return { ok: false, error: "Couldn't delete the voice. Please try again." };
  }
  revalidatePath("/brand-voice");
  revalidatePath("/");
  return { ok: true };
}
