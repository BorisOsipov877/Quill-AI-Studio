import Link from "next/link";
import { getAnalytics, MINUTES_PER_PIECE, type Analytics } from "@/lib/analytics";
import ContentTypeChart, { type ContentTypeDatum } from "@/components/ContentTypeChart";

export const dynamic = "force-dynamic";

// Validated categorical hues (data-viz palette), dark-surface steps.
const TYPE_COLORS = {
  seo: "#3987e5",
  social: "#199e70",
  email: "#7c6cff", // the app accent — validated against the dark panel surface
} as const;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default async function AnalyticsPage() {
  let data: Analytics | null = null;
  let tableMissing = false;
  try {
    data = await getAnalytics();
  } catch {
    tableMissing = true;
  }

  const chartData: ContentTypeDatum[] = data
    ? [
        { type: "SEO descriptions", count: data.seoCount, fill: TYPE_COLORS.seo },
        { type: "Social posts", count: data.socialCount, fill: TYPE_COLORS.social },
        { type: "Email copy", count: data.emailCount, fill: TYPE_COLORS.email },
      ]
    : [];

  return (
    <div className="app-grid min-h-[calc(100vh-82px)]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-[72px]">
        <div className="mb-7 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Usage &amp; impact
            </span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Analytics</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            How much you&apos;ve generated and roughly how much writing time it saved.
          </p>
        </div>

        {tableMissing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[13.5px] text-amber-800">
            <p className="font-semibold">Analytics aren&apos;t available yet.</p>
            <p className="mt-1 text-amber-700">
              Run <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px]">supabase/schema.sql</code>{" "}
              and generate some content first.
            </p>
          </div>
        ) : data && data.totalGenerations === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
            <p className="text-[14px] font-medium">No data yet</p>
            <p className="mt-1 text-[13px] text-muted">Generate some content and your stats will show up here.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-accent-strong"
            >
              Open generator
            </Link>
          </div>
        ) : (
          data && (
            <>
              {/* Stat tiles */}
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="Total generations"
                  value={data.totalGenerations.toLocaleString("en-US")}
                  sub="generation runs"
                />
                <StatTile
                  label="Content pieces"
                  value={data.totalPieces.toLocaleString("en-US")}
                  sub={`${data.seoCount} SEO · ${data.socialCount} social`}
                />
                <StatTile
                  label="Time saved"
                  value={formatDuration(data.minutesSaved)}
                  sub={`~${MINUTES_PER_PIECE} min per piece`}
                  accent
                />
              </div>

              {/* Chart + breakdown */}
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,16,22,0.04)]">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-[13.5px] font-semibold">Content by type</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {data.totalPieces} pieces
                  </span>
                </div>

                <ContentTypeChart data={chartData} />

                {/* Breakdown legend — carries identity via labels, not colour alone */}
                <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-3">
                  <LegendItem color={TYPE_COLORS.seo} label="SEO descriptions" value={data.seoCount} />
                  <LegendItem color={TYPE_COLORS.social} label="Social posts" value={data.socialCount} />
                  <LegendItem color={TYPE_COLORS.email} label="Email copy" value={data.emailCount} />
                </div>
              </section>

              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                {`Time saved is an estimate at ${MINUTES_PER_PIECE} minutes per piece of copy. ` +
                  `Email copy is shown for completeness — this tool doesn't generate email yet, ` +
                  `so it stays at zero.`}
              </p>
            </>
          )
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(16,16,22,0.04)] ${
        accent ? "border-accent/20 bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className={`mt-1.5 text-[30px] font-semibold tracking-tight ${accent ? "text-accent-strong" : ""}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{sub}</div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: color }} />
      <span className="text-[13px] font-medium">{label}</span>
      <span className="ml-auto font-mono text-[13px] tabular-nums text-muted">{value}</span>
    </div>
  );
}
