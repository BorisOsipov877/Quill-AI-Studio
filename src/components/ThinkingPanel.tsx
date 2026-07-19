"use client";

import { useEffect, useState } from "react";
import { ThinkingDots } from "@/components/Typewriter";

const STEPS = [
  "Reading your product details…",
  "Picking the angle and voice…",
  "Writing the SEO description…",
  "Drafting the social posts…",
];

/** Shown while a generation is in flight, before any copy exists. */
export default function ThinkingPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setStep((s) => (s + 1) % STEPS.length),
      1100
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="panel-empty relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden px-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,108,255,0.18),transparent_65%)] blur-[45px]"
      />

      <span className="relative flex h-[58px] w-[58px] animate-pulse items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 to-accent/[0.08] text-accent-strong shadow-[0_0_30px_rgba(124,108,255,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" />
        </svg>
      </span>

      <div className="relative mt-6 flex items-center gap-3">
        <span className="text-[17px] font-semibold text-[#d6d6e2]">Thinking</span>
        <ThinkingDots />
      </div>

      {/* Rotating status so the wait reads as progress, not a frozen spinner */}
      <p
        key={step}
        className="hint-fade relative mt-2 h-5 text-[13.5px] text-[#7a7a8c]"
        aria-live="polite"
      >
        {STEPS[step]}
      </p>
    </div>
  );
}
