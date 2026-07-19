import Link from "next/link";
import { getBrandVoices } from "@/lib/brand-voices";
import type { BrandVoice } from "@/lib/types";
import BrandVoiceForm from "@/components/BrandVoiceForm";
import DeleteVoiceButton from "@/components/DeleteVoiceButton";

export const dynamic = "force-dynamic";

export default async function BrandVoicePage() {
  let voices: BrandVoice[] = [];
  let tableMissing = false;

  try {
    voices = await getBrandVoices();
  } catch {
    tableMissing = true;
  }

  return (
    <div className="app-grid min-h-[calc(100vh-82px)]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-[72px]">
        <div className="mb-7 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Reusable tone presets
            </span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Brand voice</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            Define how your brand sounds once, then pick it on the generator instead of choosing a tone
            by hand. Every profile becomes a &ldquo;Voice&rdquo; option on the form.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-20">
            <BrandVoiceForm />
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 className="text-[13.5px] font-semibold">Saved voices</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {voices.length}
              </span>
            </div>

            {tableMissing ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[13.5px] text-amber-800">
                <p className="font-semibold">Brand voices aren&apos;t available yet.</p>
                <p className="mt-1 text-amber-700">
                  Run <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px]">supabase/schema.sql</code>{" "}
                  in the Supabase SQL editor to create the{" "}
                  <code className="font-mono text-[12px]">brand_voices</code> table.
                </p>
              </div>
            ) : voices.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
                <p className="text-[14px] font-medium">No voices yet</p>
                <p className="mt-1 max-w-xs text-[13px] text-muted">
                  Create your first brand voice with the form on the left. It&apos;ll appear here and on the generator.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {voices.map((voice) => (
                  <li
                    key={voice.id}
                    className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,16,22,0.03)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold">{voice.name}</h3>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{voice.description}</p>
                      </div>
                      <DeleteVoiceButton id={voice.id} name={voice.name} />
                    </div>

                    {voice.example_phrases.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          Example phrases
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {voice.example_phrases.map((phrase, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-accent-soft px-2 py-1 text-[12px] text-accent-strong"
                            >
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {voice.avoid_words.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          Avoid
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {voice.avoid_words.map((word, i) => (
                            <span
                              key={i}
                              className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[12px] text-red-600 line-through"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 px-1">
              <Link href="/" className="text-[13px] font-medium text-accent-strong hover:underline">
                ← Back to the generator
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
