"use client";

import { useEffect, useState } from "react";

export const TYPE_CHARS_PER_SEC = 340;

/** How long `text` takes to type itself in, in ms. */
export function typeDuration(text: string): number {
  return (text.length / TYPE_CHARS_PER_SEC) * 1000;
}

/**
 * Reveals `text` progressively.
 *
 * Note this is a presentation effect, not real streaming: the generator returns
 * the finished copy in one piece, and this plays it back so the result lands
 * the way a model writing it would. Mount with a `key` tied to the text so new
 * copy replays from the start.
 */
export function useTypewriter(
  text: string,
  { play, delayMs = 0 }: { play: boolean; delayMs?: number }
) {
  const [count, setCount] = useState(play ? 0 : text.length);

  useEffect(() => {
    if (!play) return;

    let raf = 0;
    let startedAt = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const n = Math.floor(((now - startedAt) / 1000) * TYPE_CHARS_PER_SEC);
      setCount(Math.min(n, text.length));
      if (n < text.length) raf = requestAnimationFrame(tick);
    };

    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, play, delayMs]);

  return {
    visible: text.slice(0, count),
    done: count >= text.length,
    /** true while waiting out `delayMs` — nothing has been revealed yet */
    waiting: play && count === 0,
  };
}

/** Three bouncing dots — the "still thinking" beat before text appears. */
export function ThinkingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`thinking-dots ${className}`} role="status" aria-label="Generating">
      <i />
      <i />
      <i />
    </span>
  );
}
