"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { TONES, type GeneratedContent } from "@/lib/generator/types";
import {
  generateContentAction,
  regenerateBlockAction,
  type GenerateInput,
  type RegenerateTarget,
} from "@/app/actions";
import type { RateLimitState } from "@/lib/rate-limit";
import { resizeImageToBase64 } from "@/lib/resize-image";
import ResultView, { type StreamMode } from "@/components/ResultView";
import ThinkingPanel from "@/components/ThinkingPanel";
import { toast } from "@/components/Toaster";

const TONE_HINT: Record<string, string> = {
  Professional: "Confident and credible",
  Playful: "Fun and energetic",
  Luxury: "Elegant and aspirational",
  Casual: "Warm and conversational",
};

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12MB before downscaling

const CONTROL =
  "w-full rounded-[10px] border border-line px-3.5 py-3 text-[14.5px] outline-none transition";

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  examplePhrases: string[];
}

interface UploadedImage {
  base64: string;
  dataUrl: string;
  name: string;
}

export default function GeneratorForm({
  voices,
  initialQuota,
}: {
  voices: VoiceOption[];
  initialQuota: RateLimitState;
}) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState(false);
  // "" = use the tone select below; otherwise a brand voice id overrides tone.
  const [voiceId, setVoiceId] = useState("");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Mirrored for the live counter / ready indicator.
  const [productName, setProductName] = useState("");
  const [features, setFeatures] = useState("");
  const [quota, setQuota] = useState<RateLimitState>(initialQuota);
  // Input that produced the current result — replayed for block regeneration.
  const [lastInput, setLastInput] = useState<GenerateInput | null>(null);
  const [regenerating, setRegenerating] = useState<RegenerateTarget | null>(null);
  // Whether the next render should type the copy in, and how.
  const [stream, setStream] = useState<StreamMode>(null);
  const seedRef = useRef(0);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const usingVoice = voiceId !== "";
  const selectedVoice = voices.find((v) => v.id === voiceId) ?? null;
  const ready = productName.trim().length > 0 && (features.trim().length > 0 || image !== null);
  const outOfQuota = quota.remaining <= 0;

  async function handleFile(file: File | undefined) {
    setImageError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("That's not an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setImageError("Image is too large (max 12MB).");
      return;
    }
    setProcessingImage(true);
    try {
      const resized = await resizeImageToBase64(file);
      setImage({ base64: resized.base64, dataUrl: resized.dataUrl, name: file.name });
    } catch {
      setImageError("Couldn't process that image. Try another file.");
    } finally {
      setProcessingImage(false);
    }
  }

  function removeImage() {
    setImage(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // --- drag & drop ---------------------------------------------------------
  // dragenter/leave also fire for child nodes, so depth-count to avoid flicker.
  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  }

  function currentInput(formTone: string): GenerateInput {
    return {
      productName,
      features,
      tone: formTone,
      brandVoiceId: voiceId || undefined,
      image: image ? { base64: image.base64, mediaType: "image/jpeg" } : undefined,
    };
  }

  function handleSubmit(formData: FormData) {
    const input = currentInput(String(formData.get("tone") ?? ""));

    setError(null);
    setSaveWarning(false);

    startTransition(async () => {
      const result = await generateContentAction(input);
      setQuota(result.quota);
      if (!result.ok) {
        setError(result.error);
        setContent(null);
        return;
      }
      seedRef.current = 0;
      setLastInput(input);
      setStream("full");
      setContent(result.content);
      setSaveWarning(!result.saved);
      // Bring the result into view on smaller screens.
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  function handleRegenerate(target: RegenerateTarget) {
    if (!lastInput || regenerating) return;
    setRegenerating(target);
    seedRef.current += 1;

    startTransition(async () => {
      const result = await regenerateBlockAction(lastInput, target, seedRef.current);
      setQuota(result.quota);
      setRegenerating(null);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      setStream("block");
      setContent((prev) => {
        if (!prev) return prev;
        if (result.seoDescription !== null) {
          return { ...prev, seoDescription: result.seoDescription };
        }
        const posts = [...prev.socialPosts];
        if (target.kind === "social") posts[target.index] = result.post;
        return { ...prev, socialPosts: posts };
      });
      toast(target.kind === "seo" ? "SEO description redrafted" : "Post redrafted");
    });
  }

  return (
    <div className="grid gap-9 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
      {/* Form */}
      <form action={handleSubmit} className="panel p-7 lg:sticky lg:top-[86px]">
        <div className="space-y-5">
          <Field label="Product name" htmlFor="productName">
            <input
              id="productName"
              name="productName"
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="AeroSound Wireless Headphones"
              className={CONTROL}
            />
          </Field>

          <Field
            label="Key features"
            htmlFor="features"
            hint={
              features.length > 0 ? (
                <span className="font-mono text-[11px] tabular-nums">
                  <span className={features.length < 20 ? "text-faint" : "text-accent-strong"}>
                    {features.length}
                  </span>
                  <span className="text-faint"> chars</span>
                </span>
              ) : image ? (
                "Optional — the photo will be used"
              ) : (
                "One per line or comma-separated"
              )
            }
          >
            <textarea
              id="features"
              name="features"
              required={!image}
              rows={image ? 3 : 4}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={"40h battery life\nActive noise cancellation\nMemory-foam ear cushions"}
              className={`${CONTROL} resize-y leading-relaxed`}
            />
          </Field>

          {/* Product photo — drag & drop or click. */}
          <Field label="Product photo" htmlFor="photo" hint="Optional">
            <input
              ref={fileInputRef}
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {image ? (
              <div className="flex items-center gap-3 rounded-[10px] border border-line bg-black/25 p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt="Product preview"
                  className="h-16 w-16 flex-none rounded-md border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{image.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-faint">
                    Attached — will be described by the model
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="flex-none rounded-lg border border-line bg-white/[0.02] p-1.5 text-muted transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Remove photo"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onDragEnter={onDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingImage}
                  className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed px-3 py-5 text-[14px] font-medium transition disabled:opacity-60 ${
                    dragging
                      ? "border-accent/60 bg-accent-soft text-accent-strong shadow-[0_0_30px_rgba(124,108,255,0.18)_inset]"
                      : "border-line bg-white/[0.02] text-muted hover:border-accent/40 hover:bg-accent/[0.05] hover:text-accent-strong"
                  }`}
                >
                  {processingImage ? (
                    "Processing…"
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="9" cy="9" r="1.8" />
                        <path d="m21 15-4.5-4.5L6 21" />
                      </svg>
                      {dragging ? "Drop to attach" : "Upload a product photo"}
                      {!dragging && (
                        <span className="text-[11.5px] font-normal text-faint">
                          or drag &amp; drop it here
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            )}
            {imageError && <p className="mt-1.5 text-[11.5px] text-red-300">{imageError}</p>}
          </Field>

          {/* Voice profile — overrides the tone below when one is chosen. */}
          <Field
            label="Voice"
            htmlFor="voice"
            hint={
              <Link href="/brand-voice" className="text-accent-strong hover:underline">
                Manage voices
              </Link>
            }
          >
            <div className="relative">
              <select
                id="voice"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className={`${CONTROL} appearance-none pr-9`}
              >
                <option value="">Use tone below</option>
                {voices.length > 0 && (
                  <optgroup label="Brand voices">
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronIcon />
            </div>

            {selectedVoice ? (
              <VoicePreview voice={selectedVoice} />
            ) : voices.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-faint">
                No saved voices yet.{" "}
                <Link href="/brand-voice" className="text-accent-strong hover:underline">
                  Create one
                </Link>{" "}
                to reuse a brand tone.
              </p>
            ) : null}
          </Field>

          <Field label="Tone of voice" htmlFor="tone">
            <div className={`relative ${usingVoice ? "opacity-50" : ""}`}>
              <select
                id="tone"
                name="tone"
                defaultValue="Professional"
                disabled={usingVoice}
                className={`${CONTROL} appearance-none pr-9 disabled:cursor-not-allowed`}
              >
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone} — {TONE_HINT[tone]}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
            {usingVoice && (
              <p className="mt-2 text-[12.5px] text-faint">
                Using your brand voice — the tone above is ignored.
              </p>
            )}
          </Field>

          <div className="space-y-2.5 pt-0.5">
            <button
              type="submit"
              disabled={isPending || processingImage || outOfQuota}
              className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[15.5px] font-semibold"
            >
              {isPending && !regenerating ? (
                <>
                  <Spinner /> Generating…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" />
                  </svg>
                  Generate content
                </>
              )}
            </button>

            {/* Local status: ready-to-generate + remaining quota */}
            <div className="flex items-center justify-between gap-3">
              <ReadyChip ready={ready} />
              <QuotaChip quota={quota} />
            </div>
          </div>
        </div>
      </form>

      {/* Output */}
      <div ref={resultRef} className="min-h-[200px]">
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3 text-[13.5px] text-red-200">
            <svg className="mt-0.5 flex-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {saveWarning && content && (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-2.5 text-[12.5px] text-amber-200/90">
            Content generated, but it couldn&apos;t be saved to history. Run the Supabase schema (see
            README) to enable history.
          </div>
        )}

        {isPending && !regenerating ? (
          <ThinkingPanel />
        ) : content ? (
          <ResultView
            content={content}
            onRegenerate={handleRegenerate}
            regenerating={regenerating}
            stream={stream}
          />
        ) : (
          !error && <EmptyState />
        )}
      </div>
    </div>
  );
}

/** Compact preview of the chosen brand voice — saves a trip to /brand-voice. */
function VoicePreview({ voice }: { voice: VoiceOption }) {
  const phrases = voice.examplePhrases.filter(Boolean).slice(0, 3);

  return (
    <div className="mt-2.5 rounded-[10px] border border-accent/20 bg-accent-soft/60 p-3">
      <div className="flex items-center gap-1.5">
        <svg className="text-accent-strong" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10v4M8 6v12M12 8v8M16 5v14M20 10v4" />
        </svg>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-accent-strong">
          Voice preview
        </span>
      </div>
      {voice.description && (
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
          {voice.description}
        </p>
      )}
      {phrases.length > 0 && (
        <ul className="mt-2 space-y-1">
          {phrases.map((p, i) => (
            <li key={i} className="truncate text-[12px] italic text-[#b8b4d8]">
              “{p}”
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReadyChip({ ready }: { ready: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 transition ${
        ready
          ? "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.06)]"
          : "border-line bg-white/[0.02]"
      }`}
    >
      <span
        className={`h-[6px] w-[6px] rounded-full ${
          ready ? "bg-ok shadow-[0_0_8px_rgba(74,222,128,0.9)]" : "bg-faint"
        }`}
      />
      <span
        className={`font-mono text-[9.5px] uppercase tracking-[0.16em] ${
          ready ? "text-[#8fe3ae]" : "text-faint"
        }`}
      >
        {ready ? "Ready" : "Add details"}
      </span>
    </div>
  );
}

function QuotaChip({ quota }: { quota: RateLimitState }) {
  const low = quota.remaining <= 2;
  return (
    <span
      className={`font-mono text-[10.5px] tabular-nums ${low ? "text-amber-300/80" : "text-faint"}`}
      title="Generations are rate limited per hour"
    >
      {quota.remaining}/{quota.limit} left this hour
    </span>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-[#d6d6e2]">
          {label}
        </label>
        {hint && <span className="text-[12px] text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint"
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Empty state. Shows a "ghost" of the real result layout so a first-time user
 * can see the shape of what they'll get before generating anything.
 */
function EmptyState() {
  return (
    <div className="panel-empty relative flex min-h-[520px] flex-col overflow-hidden p-7">
      {/* glow behind the icon */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,108,255,0.16),transparent_65%)] blur-[40px]"
      />

      {/* Ghost preview of the result layout */}
      <div aria-hidden className="pointer-events-none select-none opacity-[0.55]">
        <div className="rounded-2xl border border-line bg-white/[0.015] p-5">
          <div className="mb-3.5 flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-md bg-accent/20" />
            <span className="ghost-line h-3 w-32" />
          </div>
          <div className="space-y-2.5">
            <span className="ghost-line block h-3 w-full" />
            <span className="ghost-line block h-3 w-[94%]" />
            <span className="ghost-line block h-3 w-[88%]" />
            <span className="ghost-line block h-3 w-[62%]" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {["Instagram", "LinkedIn", "X / Twitter"].map((label) => (
            <div key={label} className="rounded-2xl border border-line bg-white/[0.015] p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-white/10" />
                <span className="text-[11px] font-medium text-faint">{label}</span>
              </div>
              <div className="space-y-2">
                <span className="ghost-line block h-2.5 w-full" />
                <span className="ghost-line block h-2.5 w-[85%]" />
                <span className="ghost-line block h-2.5 w-[55%]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay message */}
      <div className="relative mt-auto flex flex-col items-center pt-8 text-center">
        <span className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 to-accent/[0.08] text-accent-strong shadow-[0_0_30px_rgba(124,108,255,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" />
          </svg>
        </span>
        <p className="mt-4 text-[17px] font-semibold text-[#d6d6e2]">Your copy will appear here</p>
        <p className="mt-1.5 max-w-[420px] text-[14.5px] leading-relaxed text-[#7a7a8c]">
          You&apos;ll get an SEO description and three social posts — laid out exactly like the
          preview above.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
