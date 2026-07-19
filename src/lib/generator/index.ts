import { mockGenerate } from "./mock";
import { anthropicGenerate } from "./anthropic";
import type { GenerationSource } from "./types";

export * from "./types";

// ---------------------------------------------------------------------------
// THE SWAP POINT.
//
// The whole app calls `generateContent`. It points at the real Anthropic API,
// which needs ANTHROPIC_API_KEY in the environment (set it in Vercel's project
// settings, or in .env.local for local runs).
//
// To fall back to the offline mock — useful for UI work without burning API
// credit — change these two lines to:
//
//     export const generateContent = mockGenerate;
//     export const GENERATION_SOURCE: GenerationSource = "mock";
//
// Both functions share the exact same signature
// (input: GenerationInput) => Promise<GeneratedContent>, so nothing else changes.
// ---------------------------------------------------------------------------

export const generateContent = anthropicGenerate;
export const GENERATION_SOURCE: GenerationSource = "anthropic";

// Keep the mock referenced so it stays type-checked and is trivially available
// at the swap point above.
void mockGenerate;
