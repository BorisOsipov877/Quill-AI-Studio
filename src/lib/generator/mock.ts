import type { BrandVoiceProfile, GeneratedContent, GenerationInput, Tone } from "./types";

// ---------------------------------------------------------------------------
// MOCK generator.
//
// Returns pre-written, tone-aware placeholder copy after a short simulated
// delay — no network, no API key required. It has the exact same signature as
// the real implementation in `anthropic.ts`, so switching between them is a
// one-line change in `index.ts`.
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pull a few "feature" fragments out of the textarea (comma or newline lists)
// so the mock copy references the actual input and feels less canned.
function parseFeatures(features: string): string[] {
  return features
    .split(/[\n,;•]+/)
    // Strip a leading list marker only ("- ", "* ", "1. ", "2) ") — not a
    // leading number that's part of the text (e.g. "40h battery life").
    .map((f) => f.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

// Regeneration variety: rotate the feature list so a repeat call leads with a
// different detail. With a single feature there's nothing to rotate — the mock
// will repeat itself (the real API varies on its own).
function rotate<T>(list: T[], by: number): T[] {
  if (list.length < 2) return list;
  const n = ((by % list.length) + list.length) % list.length;
  return [...list.slice(n), ...list.slice(0, n)];
}

function joinFeatures(list: string[], max: number): string {
  const items = list.slice(0, max);
  if (items.length === 0) return "thoughtful design";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

interface ToneCopy {
  seo: (name: string, feat: string, lead: string) => string;
  instagram: (name: string, lead: string) => string;
  linkedin: (name: string, feat: string) => string;
  twitter: (name: string, lead: string) => string;
}

const TONE_COPY: Record<Tone, ToneCopy> = {
  Professional: {
    seo: (name, feat, lead) =>
      `Meet the ${name} — engineered for people who expect more from every detail. With ${feat}, it delivers dependable performance you can build your day around.\n\n` +
      `Every element is designed with intent, from ${lead} to a finish that holds up to daily use. The result is a product that quietly does its job, exceptionally well.\n\n` +
      `Choose the ${name} and invest in quality that pays off over time. It's the confident, no-compromise choice for anyone who values doing things right.`,
    instagram: (name, lead) =>
      `Introducing the ${name}. ✨ Built around ${lead} — designed to fit seamlessly into your everyday. Tap to explore.`,
    linkedin: (name, feat) =>
      `We built the ${name} for professionals who don't settle. With ${feat}, it's engineered to perform where it matters most. Learn more about what sets it apart.`,
    twitter: (name, lead) =>
      `The ${name} is here. ${cap(lead)}, done right. No gimmicks — just quality that lasts.`,
  },
  Playful: {
    seo: (name, feat, lead) =>
      `Say hello to the ${name} — the little upgrade your life didn't know it needed! 🎉 Packed with ${feat}, it's here to make the everyday a whole lot more fun.\n\n` +
      `From ${lead} to all the tiny details, we sweated the small stuff so you don't have to. It's easy, it's delightful, and honestly? It's kind of addictive.\n\n` +
      `Grab the ${name} and treat yourself. You deserve nice things — especially ones this good.`,
    instagram: (name, lead) =>
      `Okay, the ${name} is officially our new obsession 😍 ${cap(lead)} and then some. Who's grabbing one? 🙋‍♀️ #treatyourself`,
    linkedin: (name, feat) =>
      `Work should be a little more fun, right? The ${name} — with ${feat} — brings some joy back to the everyday. Curious? Come take a look. 😊`,
    twitter: (name, lead) =>
      `warning: the ${name} may cause spontaneous joy 🎉 ${cap(lead)}. you've been warned.`,
  },
  Luxury: {
    seo: (name, feat, lead) =>
      `The ${name} is an exercise in refinement. Crafted with ${feat}, it is created for those who recognise that true luxury lives in the details.\n\n` +
      `Consider ${lead}: quietly exceptional, never ostentatious. Each material is chosen with care, each line drawn with purpose — a piece meant to be kept, not replaced.\n\n` +
      `To own the ${name} is to choose the enduring over the disposable. This is understated excellence, made to be lived with for years to come.`,
    instagram: (name, lead) =>
      `The ${name}. Where ${lead} becomes an art form. Discover the collection.`,
    linkedin: (name, feat) =>
      `The ${name} represents our commitment to uncompromising craftsmanship. Distinguished by ${feat}, it is designed for those who value the enduring over the ephemeral.`,
    twitter: (name, lead) =>
      `The ${name}. ${cap(lead)}, refined to its essence. Understated. Enduring.`,
  },
  Casual: {
    seo: (name, feat, lead) =>
      `So, meet the ${name} — a genuinely handy pick you'll reach for all the time. It comes with ${feat}, which makes the everyday stuff a little easier.\n\n` +
      `The best part? ${cap(lead)} that just works, no fuss, no learning curve. It slots right into your routine like it's always been there.\n\n` +
      `If you've been meaning to upgrade, the ${name} is an easy yes. Simple, reliable, and honestly just nice to have around.`,
    instagram: (name, lead) =>
      `Been loving the ${name} lately 💛 ${cap(lead)} without the fuss. Highly recommend if you've been on the fence!`,
    linkedin: (name, feat) =>
      `Sharing something we're genuinely proud of: the ${name}. With ${feat}, it's a simple, reliable upgrade for the everyday. Happy to tell you more.`,
    twitter: (name, lead) =>
      `honestly? the ${name} just makes life easier. ${cap(lead)}, zero fuss. can recommend 👍`,
  },
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function mockGenerate(input: GenerationInput): Promise<GeneratedContent> {
  // Simulate model latency (1–2s) so the loading UI is exercised.
  await delay(1000 + Math.random() * 1000);

  const name = input.productName.trim() || "your product";
  const features = rotate(parseFeatures(input.features), input.variantSeed ?? 0);
  // The mock can't actually read the photo (the real API branch does). When a
  // photo is the only input, synthesize plausible features so the copy still
  // reads naturally.
  if (features.length === 0 && input.image) {
    features.push("a clean, modern design", "quality materials", "everyday practicality");
  }
  const featurePhrase = joinFeatures(features, 3);
  const lead = (features[0] ?? "thoughtful design").toLowerCase();

  // A brand voice profile overrides the generic tone.
  if (input.brandVoice) {
    return mockGenerateWithVoice(name, featurePhrase, lead, input.brandVoice);
  }

  const copy = TONE_COPY[input.tone];

  return {
    seoDescription: copy.seo(name, featurePhrase, lead),
    socialPosts: [
      { label: "Instagram", text: copy.instagram(name, lead) },
      { label: "LinkedIn", text: copy.linkedin(name, featurePhrase) },
      { label: "X / Twitter", text: copy.twitter(name, lead) },
    ],
  };
}

// Placeholder copy flavored by a saved brand voice — opens with a characteristic
// phrase and weaves the voice's style description into the body. (The mock can't
// truly enforce avoid-words; the real API branch does.)
function mockGenerateWithVoice(
  name: string,
  featurePhrase: string,
  lead: string,
  voice: BrandVoiceProfile
): GeneratedContent {
  const phrases = voice.examplePhrases.filter(Boolean);
  const opener = phrases[0] ? cap(phrases[0]) : `Meet the ${name}`;
  const echo = phrases[1] ?? phrases[0] ?? "";
  const desc = voice.description.trim();
  const descSentence = desc ? (/[.!?]$/.test(desc) ? desc : `${desc}.`) : "";

  return {
    seoDescription:
      `${opener}. The ${name} brings together ${featurePhrase} — made for people who expect more.\n\n` +
      `${descSentence ? `${cap(descSentence)} ` : ""}That spirit runs through every detail of the ${name}, from ${lead} to the finishing touches.\n\n` +
      `${echo ? `${cap(echo)}. ` : ""}Discover the ${name} today.`,
    socialPosts: [
      {
        label: "Instagram",
        text: `${opener} ✨ The ${name} — ${lead}, done our way. #${voice.name.replace(/[^a-zA-Z0-9]/g, "")}`,
      },
      {
        label: "LinkedIn",
        text: `Introducing the ${name}: ${featurePhrase}.${descSentence ? ` ${cap(descSentence)}` : ""}`,
      },
      {
        label: "X / Twitter",
        text: `${echo ? cap(echo) : `The ${name}`}. ${cap(lead)}, no compromises.`,
      },
    ],
  };
}
