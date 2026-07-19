import type { GenerationInput, Tone } from "./types";

// Guidance injected per tone so the model adapts voice without us having to
// enumerate everything in the base prompt.
const TONE_GUIDANCE: Record<Tone, string> = {
  Professional:
    "Confident, precise, and credible. Lead with benefits and specifics. No slang, minimal or no emoji.",
  Playful:
    "Fun, energetic, and a little cheeky. Short punchy sentences. Emoji are welcome where they add personality.",
  Luxury:
    "Elegant, aspirational, and understated. Evoke craftsmanship and exclusivity. Restrained; at most one tasteful emoji.",
  Casual:
    "Warm, friendly, and conversational — like recommending something to a friend. Light emoji use is fine.",
};

export const SYSTEM_PROMPT = `You are a senior e-commerce copywriter and SEO specialist.
You write conversion-focused product copy that is accurate, benefit-led, and never generic filler.

Rules:
- Ground every claim in the provided product name, features, and any attached product photo. Do not invent specs, prices, or facts that were not given or clearly visible in the photo.
- If a photo is attached, first identify the product and its visible qualities (materials, form, colour, use), then write the copy from that — treat the image as the primary source when text details are sparse.
- Write in the requested voice consistently across all outputs. If a brand voice profile is provided, follow it precisely — match its style, echo the spirit of its example phrases, and never use any of its avoid words.
- SEO description: 2-3 short paragraphs (roughly 60-120 words total). Naturally weave in the product name and the most search-relevant terms from the features. No keyword stuffing, no headings, no markdown.
- Social posts: produce exactly 3, one each for Instagram, LinkedIn, and X / Twitter. Keep them short (1-3 sentences). Use emoji only where they fit the voice and platform. Tailor voice to each platform (Instagram = lifestyle/visual, LinkedIn = professional value, X / Twitter = punchy and concise).
- Output must exactly match the requested JSON schema. Return only the structured data.`;

export function buildUserPrompt(input: GenerationInput): string {
  const hasFeatures = input.features.trim().length > 0;
  const lines: string[] = [`Product name: ${input.productName}`, ``];

  if (input.image) {
    lines.push(
      `A product photo is attached. Study it carefully: identify the product, its materials, form factor, and any visible details, and base the copy on what you actually see.`,
      ``
    );
  }

  if (hasFeatures) {
    lines.push(`Key features / details:`, input.features, ``);
  } else if (input.image) {
    lines.push(`No text details were provided — derive the key features from the attached photo.`, ``);
  }

  if (input.brandVoice) {
    const v = input.brandVoice;
    lines.push(
      `Write in this BRAND VOICE (this overrides any generic tone):`,
      `- Voice name: ${v.name}`,
      `- Style: ${v.description}`
    );
    if (v.examplePhrases.length > 0) {
      lines.push(`- Characteristic phrases/words to echo the spirit of: ${v.examplePhrases.join("; ")}`);
    }
    if (v.avoidWords.length > 0) {
      lines.push(`- NEVER use these words/phrases: ${v.avoidWords.join("; ")}`);
    }
  } else {
    lines.push(`Tone of voice: ${input.tone}`, `Tone guidance: ${TONE_GUIDANCE[input.tone]}`);
  }

  lines.push(
    ``,
    `Write an SEO product description and 3 social posts (Instagram, LinkedIn, X / Twitter) following the voice above.`
  );

  // Set when the user asked for another draft — push for a genuinely different
  // angle rather than a reworded version of the same one.
  if (input.variantSeed) {
    lines.push(
      ``,
      `This is regeneration #${input.variantSeed}. Take a noticeably different angle from an obvious first draft: lead with a different feature, and vary the structure and opening. Do not simply reword the same copy.`
    );
  }

  return lines.join("\n");
}
