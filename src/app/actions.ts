"use server";

import { revalidatePath } from "next/cache";
import {
  generateContent,
  GENERATION_SOURCE,
  GeneratorError,
  isTone,
  type GeneratedContent,
  type SocialPost,
} from "@/lib/generator";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getBrandVoiceById } from "@/lib/brand-voices";
import {
  consumeRateLimit,
  peekRateLimit,
  type RateLimitState,
} from "@/lib/rate-limit";
import { getRateLimitKey } from "@/lib/request-key";
import type {
  BrandVoiceProfile,
  GenerationInput,
  ImageMediaType,
  ProductImage,
  Tone,
} from "@/lib/generator";

const ALLOWED_IMAGE_TYPES: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export interface GenerateInput {
  productName: string;
  features: string;
  tone: string;
  brandVoiceId?: string; // when set (and valid), overrides the tone
  image?: { base64: string; mediaType: string }; // optional product photo
}

export type GenerateResult =
  | { ok: true; content: GeneratedContent; id: string | null; saved: boolean; quota: RateLimitState }
  | { ok: false; error: string; quota: RateLimitState };

/** Which part of an existing result to draft again. */
export type RegenerateTarget = { kind: "seo" } | { kind: "social"; index: number };

export type RegenerateResult =
  | { ok: true; seoDescription: string; post: null; quota: RateLimitState }
  | { ok: true; seoDescription: null; post: SocialPost; quota: RateLimitState }
  | { ok: false; error: string; quota: RateLimitState };

/** Current quota for this caller, without spending any of it. */
export async function getQuotaAction(): Promise<RateLimitState> {
  return peekRateLimit(await getRateLimitKey());
}

// Shared validation + brand-voice resolution for both actions.
type Resolved =
  | { ok: true; input: GenerationInput; voiceLabel: string }
  | { ok: false; error: string };

async function resolveInput(raw: GenerateInput, variantSeed?: number): Promise<Resolved> {
  const productName = raw.productName?.trim() ?? "";
  const features = raw.features?.trim() ?? "";
  const tone = raw.tone?.trim() ?? "";

  // Validate the optional product photo (defensive — the client only sends jpeg).
  let image: ProductImage | undefined;
  if (raw.image?.base64) {
    if (!ALLOWED_IMAGE_TYPES.includes(raw.image.mediaType as ImageMediaType)) {
      return { ok: false, error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." };
    }
    image = { base64: raw.image.base64, mediaType: raw.image.mediaType as ImageMediaType };
  }

  if (!productName) return { ok: false, error: "Please enter a product name." };
  if (!features && !image) {
    return { ok: false, error: "Add key features or upload a product photo." };
  }
  if (!isTone(tone)) return { ok: false, error: "Please choose a valid tone of voice." };

  // Resolve an optional brand voice. If the id doesn't resolve (deleted, or the
  // table isn't set up), we silently fall back to the tone.
  let brandVoice: BrandVoiceProfile | undefined;
  let voiceLabel: string = tone; // what we store in `content_generations.tone`
  if (raw.brandVoiceId) {
    try {
      const voice = await getBrandVoiceById(raw.brandVoiceId);
      if (voice) {
        brandVoice = {
          name: voice.name,
          description: voice.description,
          examplePhrases: voice.example_phrases ?? [],
          avoidWords: voice.avoid_words ?? [],
        };
        voiceLabel = voice.name;
      }
    } catch {
      // ignore — fall back to tone
    }
  }

  return {
    ok: true,
    voiceLabel,
    input: { productName, features, tone: tone as Tone, brandVoice, image, variantSeed },
  };
}

export async function generateContentAction(input: GenerateInput): Promise<GenerateResult> {
  const key = await getRateLimitKey();

  const resolved = await resolveInput(input);
  if (!resolved.ok) return { ok: false, error: resolved.error, quota: peekRateLimit(key) };

  // Spend quota only once the input is known-good.
  const quota = consumeRateLimit(key);
  if (!quota.allowed) {
    return {
      ok: false,
      error: "You've used all your generations for this hour. Try again a little later.",
      quota,
    };
  }

  // 1) Generate (mock today, real Anthropic when swapped). Any generation
  //    failure is fatal — surface a friendly message.
  let content: GeneratedContent;
  try {
    content = await generateContent(resolved.input);
  } catch (err) {
    const message =
      err instanceof GeneratorError
        ? err.message
        : "Something went wrong while generating content. Please try again.";
    return { ok: false, error: message, quota };
  }

  // 2) Persist (best-effort). A DB failure shouldn't lose the result the user
  //    just waited for — return the content and flag that saving failed.
  let id: string | null = null;
  let saved = false;
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("content_generations")
      .insert({
        product_name: resolved.input.productName,
        // `features` is NOT NULL — store a marker when the input was a photo only.
        features: resolved.input.features || "(generated from product photo)",
        tone: resolved.voiceLabel, // brand voice name when used, else the plain tone
        seo_description: content.seoDescription,
        social_posts: content.socialPosts,
        source: GENERATION_SOURCE,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save generation:", error.message);
    } else {
      id = data.id as string;
      saved = true;
      revalidatePath("/history");
    }
  } catch (err) {
    console.error("Failed to save generation:", err instanceof Error ? err.message : err);
  }

  return { ok: true, content, id, saved, quota };
}

/**
 * Draft a single block again (the SEO description, or one social post) without
 * touching the rest of the result. Costs one generation from the same quota.
 *
 * Deliberately does NOT write to history: the saved row is the original
 * generation, and re-drafting one block is iteration, not a new generation.
 */
export async function regenerateBlockAction(
  input: GenerateInput,
  target: RegenerateTarget,
  variantSeed: number
): Promise<RegenerateResult> {
  const key = await getRateLimitKey();

  const resolved = await resolveInput(input, variantSeed);
  if (!resolved.ok) return { ok: false, error: resolved.error, quota: peekRateLimit(key) };

  const quota = consumeRateLimit(key);
  if (!quota.allowed) {
    return {
      ok: false,
      error: "You've used all your generations for this hour. Try again a little later.",
      quota,
    };
  }

  let content: GeneratedContent;
  try {
    content = await generateContent(resolved.input);
  } catch (err) {
    const message =
      err instanceof GeneratorError
        ? err.message
        : "Couldn't regenerate that block. Please try again.";
    return { ok: false, error: message, quota };
  }

  if (target.kind === "seo") {
    return { ok: true, seoDescription: content.seoDescription, post: null, quota };
  }

  const post = content.socialPosts[target.index];
  if (!post) {
    return { ok: false, error: "That block no longer exists.", quota };
  }
  return { ok: true, seoDescription: null, post, quota };
}
