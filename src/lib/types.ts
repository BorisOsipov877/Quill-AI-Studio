import type { SocialPost, GenerationSource } from "@/lib/generator";

// A stored generation row from the `content_generations` table.
export interface ContentGeneration {
  id: string;
  product_name: string;
  features: string;
  tone: string;
  seo_description: string;
  social_posts: SocialPost[];
  source: GenerationSource;
  created_at: string;
}

// A stored brand voice profile from the `brand_voices` table.
export interface BrandVoice {
  id: string;
  name: string;
  description: string;
  example_phrases: string[];
  avoid_words: string[];
  created_at: string;
}
