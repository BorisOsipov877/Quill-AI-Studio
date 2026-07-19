"use server";

import { generateContent, GeneratorError, isTone, type GeneratedContent } from "@/lib/generator";

export interface BatchRowInput {
  name: string;
  features: string;
  tone: string;
}

export type BatchRowResult =
  | { ok: true; content: GeneratedContent }
  | { ok: false; error: string };

// Generates copy for a single CSV row. Unlike the main generator action, this
// does NOT save to history — a batch produces its own results table + CSV
// export, so we don't flood the history feed with dozens of rows.
//
// The client calls this once per row, sequentially, so we never fire parallel
// requests at the API (rate-limit friendly).
export async function generateBatchRowAction(input: BatchRowInput): Promise<BatchRowResult> {
  const name = input.name?.trim() ?? "";
  const features = input.features?.trim() ?? "";
  const tone = input.tone?.trim() ?? "";

  if (!name) return { ok: false, error: "Missing product name." };
  if (!features) return { ok: false, error: "Missing features." };
  if (!isTone(tone)) return { ok: false, error: "Invalid tone." };

  try {
    const content = await generateContent({ productName: name, features, tone });
    return { ok: true, content };
  } catch (err) {
    const message =
      err instanceof GeneratorError ? err.message : "Generation failed for this row.";
    return { ok: false, error: message };
  }
}
