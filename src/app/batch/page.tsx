import BatchRunner from "@/components/BatchRunner";

// The root layout reads the History count for the nav badge; prerendering this
// page would freeze that badge at build time.
export const dynamic = "force-dynamic";

export default function BatchPage() {
  return (
    <div className="app-grid min-h-[calc(100vh-82px)]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-[72px]">
        <div className="mb-7 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Bulk generation
            </span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Batch</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            Upload a CSV of products and generate copy for all of them at once. Rows are processed one
            at a time (never in parallel) to stay within API rate limits, then you can export everything
            as a CSV.
          </p>
        </div>

        <BatchRunner />
      </div>
    </div>
  );
}
