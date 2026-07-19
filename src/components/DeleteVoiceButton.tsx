"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBrandVoiceAction } from "@/app/brand-voice/actions";

export default function DeleteVoiceButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete the "${name}" voice? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteBrandVoiceAction(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Delete ${name}`}
      className="rounded-lg border border-line bg-surface p-1.5 text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      </svg>
    </button>
  );
}
