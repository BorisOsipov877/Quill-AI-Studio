"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrandVoiceAction } from "@/app/brand-voice/actions";

export default function BrandVoiceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setJustSaved(false);
    startTransition(async () => {
      const result = await createBrandVoiceAction({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        examplePhrases: String(formData.get("examplePhrases") ?? ""),
        avoidWords: String(formData.get("avoidWords") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
      router.refresh(); // pull the updated list into the server component
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,16,22,0.04)]"
    >
      <div className="space-y-4">
        <Field label="Voice name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Nova House Style"
            className="w-full rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-[14px] outline-none transition placeholder:text-muted/70 focus:border-accent/50 focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </Field>

        <Field label="Style description" htmlFor="description" hint="How should it sound?">
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            placeholder="Warm and witty, confident but never arrogant. Speaks to makers and creatives like a knowledgeable friend."
            className="w-full resize-y rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-[14px] leading-relaxed outline-none transition placeholder:text-muted/70 focus:border-accent/50 focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </Field>

        <Field label="Example phrases / words" htmlFor="examplePhrases" hint="3–5, one per line">
          <textarea
            id="examplePhrases"
            name="examplePhrases"
            required
            rows={4}
            placeholder={"Built to last, not to impress\nMade for makers\nNo fluff, just craft"}
            className="w-full resize-y rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-[14px] leading-relaxed outline-none transition placeholder:text-muted/70 focus:border-accent/50 focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </Field>

        <Field label="Words to avoid" htmlFor="avoidWords" hint="Optional, one per line">
          <textarea
            id="avoidWords"
            name="avoidWords"
            rows={2}
            placeholder={"cheap\nrevolutionary\ngame-changer"}
            className="w-full resize-y rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-[14px] leading-relaxed outline-none transition placeholder:text-muted/70 focus:border-accent/50 focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
            {error}
          </div>
        )}
        {justSaved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            Voice saved — it&apos;s now available on the generator.
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save voice"}
        </button>
      </div>
    </form>
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
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-[12.5px] font-semibold text-ink">
          {label}
        </label>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
