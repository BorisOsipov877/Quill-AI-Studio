import Link from "next/link";
import { notFound } from "next/navigation";
import { getGenerationById } from "@/lib/generations";
import ResultView from "@/components/ResultView";

export const dynamic = "force-dynamic";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function GenerationDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const gen = await getGenerationById(id);
  if (!gen) notFound();

  return (
    <div className="app-grid min-h-[calc(100vh-82px)]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-[72px]">
        <Link
          href="/history"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to history
        </Link>

        <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{gen.product_name}</h1>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-strong">
              {gen.tone}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">{formatDate(gen.created_at)}</p>

          <div className="mt-4 border-t border-line pt-3.5">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Input features
            </div>
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink/85">{gen.features}</p>
          </div>
        </div>

        <ResultView
          content={{ seoDescription: gen.seo_description, socialPosts: gen.social_posts }}
        />
      </div>
    </div>
  );
}
