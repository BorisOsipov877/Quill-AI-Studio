import GeneratorForm from "@/components/GeneratorForm";
import { getBrandVoicesSafe } from "@/lib/brand-voices";
import { peekRateLimit } from "@/lib/rate-limit";
import { getRateLimitKey } from "@/lib/request-key";

export const dynamic = "force-dynamic";

export default async function Home() {
  const voices = (await getBrandVoicesSafe()).map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description ?? "",
    examplePhrases: v.example_phrases ?? [],
  }));
  const quota = peekRateLimit(await getRateLimitKey());

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-[72px]">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/28 bg-accent-soft px-4 py-1.5 shadow-[0_0_20px_rgba(124,108,255,0.12)]">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-strong shadow-[0_0_8px_rgba(157,143,255,0.9)]" />
          <span className="eyebrow">Product copywriting, in seconds</span>
        </div>
        <h1 className="hero-title mt-5 text-[38px] font-bold leading-[1.05] sm:text-[52px]">
          Write product copy that sells.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted sm:text-[17px]">
          Describe your product, choose a tone, and Quill drafts an SEO-ready description plus three
          social posts — Instagram, LinkedIn, and X. Copy any block with one click.
        </p>
      </div>

      <div className="mt-12">
        <GeneratorForm voices={voices} initialQuota={quota} />
      </div>
    </div>
  );
}
