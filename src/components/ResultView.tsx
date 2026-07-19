"use client";

import type { GeneratedContent } from "@/lib/generator/types";
import type { RegenerateTarget } from "@/app/actions";
import CopyButton from "@/components/CopyButton";
import { ThinkingDots, typeDuration, useTypewriter } from "@/components/Typewriter";

const PLATFORM_ICON: Record<string, string> = {
  Instagram: "◇",
  LinkedIn: "in",
  "X / Twitter": "𝕏",
};

/** Gap between the SEO block finishing and the posts starting to type. */
const HANDOFF_MS = 160;
/** Stagger between the three posts. */
const POST_STAGGER_MS = 180;

/**
 * "full"  — a fresh generation: SEO types first, then the posts.
 * "block" — one block was redrafted: it types on its own, immediately.
 * null    — read-only (History); everything is shown at once.
 */
export type StreamMode = "full" | "block" | null;

export default function ResultView({
  content,
  onRegenerate,
  regenerating = null,
  stream = null,
}: {
  content: GeneratedContent;
  /** Omitted on read-only views (e.g. a saved generation in History). */
  onRegenerate?: (target: RegenerateTarget) => void;
  regenerating?: RegenerateTarget | null;
  stream?: StreamMode;
}) {
  const seoBusy = regenerating?.kind === "seo";
  const play = stream !== null;
  const postBaseDelay =
    stream === "full" ? typeDuration(content.seoDescription) + HANDOFF_MS : 0;

  return (
    <div className="space-y-4">
      {/* SEO description */}
      <section className="panel-sm p-6">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-accent/25 bg-accent-soft text-accent-strong">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </span>
            <h3 className="text-[13.5px] font-semibold">SEO description</h3>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-faint sm:inline">
              search-optimized
            </span>
          </div>
          <div className="flex flex-none items-center gap-2">
            {onRegenerate && (
              <RegenerateButton
                busy={seoBusy}
                disabled={regenerating !== null}
                onClick={() => onRegenerate({ kind: "seo" })}
                label="Regenerate SEO description"
              />
            )}
            <CopyButton text={content.seoDescription} />
          </div>
        </div>
        <TypedParagraphs
          key={content.seoDescription}
          text={content.seoDescription}
          play={play}
          dimmed={seoBusy}
        />
      </section>

      {/* Social posts */}
      <section>
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <h3 className="text-[13.5px] font-semibold">Social posts</h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {content.socialPosts.length} variants
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {content.socialPosts.map((post, i) => {
            const busy = regenerating?.kind === "social" && regenerating.index === i;
            return (
              <div key={i} className="panel-sm flex flex-col p-4.5">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-line bg-black/25 font-mono text-[10px] text-muted">
                    {PLATFORM_ICON[post.label] ?? "•"}
                  </span>
                  <span className="text-[12.5px] font-semibold">{post.label}</span>
                  {onRegenerate && (
                    <span className="ml-auto">
                      <RegenerateButton
                        busy={busy}
                        disabled={regenerating !== null}
                        onClick={() => onRegenerate({ kind: "social", index: i })}
                        label={`Regenerate ${post.label} post`}
                        compact
                      />
                    </span>
                  )}
                </div>
                <TypedPost
                  key={post.text}
                  text={post.text}
                  play={play}
                  delayMs={postBaseDelay + i * POST_STAGGER_MS}
                  dimmed={busy}
                />
                <div className="mt-3.5">
                  <CopyButton text={post.text} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TypedParagraphs({
  text,
  play,
  dimmed,
}: {
  text: string;
  play: boolean;
  dimmed: boolean;
}) {
  const { visible, done } = useTypewriter(text, { play });
  const paragraphs = visible.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div
      className={`space-y-2.5 text-[14.5px] leading-relaxed text-ink/90 transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      {paragraphs.map((p, i) => (
        <p key={i}>
          {p}
          {!done && i === paragraphs.length - 1 && <span className="type-caret" />}
        </p>
      ))}
      {/* Keeps the block from collapsing before the first character lands. */}
      {paragraphs.length === 0 && <p className="min-h-[1.5em]" />}
    </div>
  );
}

function TypedPost({
  text,
  play,
  delayMs,
  dimmed,
}: {
  text: string;
  play: boolean;
  delayMs: number;
  dimmed: boolean;
}) {
  const { visible, done, waiting } = useTypewriter(text, { play, delayMs });

  return (
    <p
      className={`flex-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink/90 transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      {waiting ? (
        <ThinkingDots className="py-1" />
      ) : (
        <>
          {visible}
          {!done && <span className="type-caret" />}
        </>
      )}
    </p>
  );
}

function RegenerateButton({
  busy,
  disabled,
  onClick,
  label,
  compact = false,
}: {
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] font-medium text-muted transition hover:border-accent/35 hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? "p-1.5" : "px-2.5 py-1.5 text-[12.5px]"
      }`}
    >
      <svg
        className={busy ? "animate-spin" : ""}
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 3v6h-6" />
      </svg>
      {!compact && (busy ? "Redrafting…" : "Regenerate")}
    </button>
  );
}
