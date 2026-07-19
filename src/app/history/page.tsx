import Link from "next/link";
import { getRecentGenerations } from "@/lib/generations";
import type { ContentGeneration } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function HistoryPage() {
  let generations: ContentGeneration[] = [];
  let errorMessage: string | null = null;

  try {
    generations = await getRecentGenerations();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Could not load history.";
  }

  return (
    <div className="app-grid min-h-[calc(100vh-82px)]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-[72px]">
        <div className="mb-6">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">History</h1>
          <p className="mt-1.5 text-[14px] text-muted">
            Your recent generations, newest first. Click any entry to view the full result.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[13.5px] text-amber-800">
            <p className="font-semibold">History isn&apos;t available yet.</p>
            <p className="mt-1 text-amber-700">
              Run <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px]">supabase/schema.sql</code>{" "}
              in the Supabase SQL editor to create the <code className="font-mono text-[12px]">content_generations</code> table.
            </p>
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
            <p className="text-[14px] font-medium">No generations yet</p>
            <p className="mt-1 text-[13px] text-muted">Head to the generator and create your first piece of copy.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-accent-strong"
            >
              Open generator
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {generations.map((gen) => (
              <li key={gen.id}>
                <Link
                  href={`/history/${gen.id}`}
                  className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,16,22,0.03)] transition hover:border-accent/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[14.5px] font-semibold group-hover:text-accent-strong">
                        {gen.product_name}
                      </h3>
                      <span className="flex-none rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-accent-strong">
                        {gen.tone}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                      {gen.seo_description}
                    </p>
                    <div className="mt-2 flex items-center gap-2.5 text-[11.5px] text-muted">
                      <span>{formatDate(gen.created_at)}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-muted/50" />
                      <span>{gen.social_posts.length} social posts</span>
                    </div>
                  </div>
                  <svg
                    className="mt-1 flex-none text-muted transition group-hover:translate-x-0.5 group-hover:text-accent-strong"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
