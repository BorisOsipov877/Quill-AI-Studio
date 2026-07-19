"use client";

import { useEffect, useState } from "react";

const TOAST_EVENT = "quill:toast";
const DURATION_MS = 1900;

interface ToastItem {
  id: number;
  message: string;
}

/** Fire a toast from anywhere on the client. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let seq = 0;
    const timers: number[] = [];

    function onToast(e: Event) {
      const message = (e as CustomEvent<string>).detail;
      const id = ++seq;
      setItems((prev) => [...prev, { id, message }]);
      timers.push(
        window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), DURATION_MS)
      );
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-7 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="toast-in flex items-center gap-2 rounded-full border border-accent/30 bg-[#16161f]/95 px-4 py-2.5 text-[13.5px] font-medium text-ink shadow-[0_0_24px_rgba(124,108,255,0.25),0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok/15 text-ok">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
