export const TONES = ["Professional", "Playful", "Luxury", "Casual"] as const;
export type Tone = (typeof TONES)[number];

export function isTone(value: string): value is Tone {
  return (TONES as readonly string[]).includes(value);
}

// A brand voice used to generate copy instead of a plain tone.
export interface BrandVoiceProfile {
  name: string;
  description: string;
  examplePhrases: string[];
  avoidWords: string[];
}

// The media types the Anthropic image block accepts.
export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface ProductImage {
  base64: string; // raw base64, no "data:" prefix
  mediaType: ImageMediaType;
}

export interface GenerationInput {
  productName: string;
  features: string; // may be empty when a product photo is supplied
  tone: Tone; // always present — the fallback when no brand voice is chosen
  brandVoice?: BrandVoiceProfile; // when set, overrides `tone`
  image?: ProductImage; // when set, the model describes the product from the photo
  /**
   * Bumped on each "regenerate" so a repeat call produces a different draft.
   * The mock rotates which features it leads with; the real API also gets an
   * explicit instruction to take a fresh angle.
   */
  variantSeed?: number;
}

export interface SocialPost {
  label: string; // e.g. "Instagram", "LinkedIn", "X / Twitter"
  text: string;
}

export interface GeneratedContent {
  seoDescription: string;
  socialPosts: SocialPost[];
}

// Where the content came from — lets the UI/db distinguish mock vs live API.
export type GenerationSource = "mock" | "anthropic";

// Thrown by generator implementations with a user-facing `message`. The Server
// Action surfaces `.message` directly, so keep these human-readable.
export class GeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratorError";
  }
}
