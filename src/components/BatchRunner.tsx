"use client";

import { useRef, useState } from "react";
import { TONES, type SocialPost } from "@/lib/generator/types";
import { parseProductCsv, toCsv, type ProductRow } from "@/lib/csv";
import { generateBatchRowAction } from "@/app/batch/actions";

const MAX_ROWS = 100;

const SAMPLE_CSV = [
  "name,features",
  '"AeroSound Headphones","40h battery life, active noise cancellation, memory-foam cushions"',
  '"Pulse Earbuds","IPX4 water resistance, touch controls, 24h case"',
  '"BoomCube Speaker","20h battery, splash-proof, stereo pairing"',
].join("\r\n");

interface BatchResult {
  name: string;
  features: string;
  seoDescription: string;
  socialPosts: SocialPost[];
  error?: string;
}

type Phase = "idle" | "running" | "done";

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchRunner() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [tone, setTone] = useState<string>("Professional");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);

  async function handleFile(file: File | undefined) {
    setParseError(null);
    if (!file) return;
    resetRun();
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseProductCsv(text, MAX_ROWS);
      if (parsed.error) {
        setRows([]);
        setParseError(parsed.error);
        return;
      }
      setRows(parsed.rows);
    } catch {
      setRows([]);
      setParseError("Couldn't read that file.");
    }
  }

  function resetRun() {
    setPhase("idle");
    setProgress(0);
    setResults([]);
  }

  function clearFile() {
    setFileName(null);
    setRows([]);
    setParseError(null);
    resetRun();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function runAll() {
    if (rows.length === 0) return;
    setPhase("running");
    setProgress(0);

    const collected: BatchResult[] = [];
    // Sequential — one API round-trip at a time, never parallel.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const res = await generateBatchRowAction({ name: row.name, features: row.features, tone });
      collected.push(
        res.ok
          ? {
              name: row.name,
              features: row.features,
              seoDescription: res.content.seoDescription,
              socialPosts: res.content.socialPosts,
            }
          : { name: row.name, features: row.features, seoDescription: "", socialPosts: [], error: res.error }
      );
      setResults([...collected]);
      setProgress(i + 1);
    }

    setPhase("done");
  }

  function handleExport() {
    const header = ["name", "features", "seo_description", "instagram", "linkedin", "x_twitter", "status"];
    const postText = (r: BatchResult, label: string) =>
      r.socialPosts.find((p) => p.label === label)?.text ?? "";
    const data = results.map((r) => [
      r.name,
      r.features,
      r.seoDescription,
      postText(r, "Instagram"),
      postText(r, "LinkedIn"),
      postText(r, "X / Twitter"),
      r.error ? `Error: ${r.error}` : "ok",
    ]);
    downloadCsv("content-batch.csv", toCsv(header, data));
  }

  const total = rows.length;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  const failures = results.filter((r) => r.error).length;

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Upload / file summary */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,16,22,0.04)]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas/40 px-6 py-10 text-center transition hover:border-accent/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V3m0 0-4 4m4-4 4 4" />
                <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
              </svg>
            </span>
            <span className="text-[14px] font-semibold">Upload a CSV</span>
            <span className="text-[12.5px] text-muted">
              Columns: <span className="font-mono text-[11.5px]">name</span>,{" "}
              <span className="font-mono text-[11.5px]">features</span> · up to {MAX_ROWS} rows
            </span>
          </button>
          {parseError && <p className="mt-3 text-[12.5px] text-red-600">{parseError}</p>}
          <p className="mt-3 text-center text-[12px] text-muted">
            Not sure of the format?{" "}
            <button
              type="button"
              onClick={() => downloadCsv("content-template.csv", SAMPLE_CSV)}
              className="font-medium text-accent-strong hover:underline"
            >
              Download a sample CSV
            </button>
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,16,22,0.04)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M5 21V5a2 2 0 0 1 2-2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">{fileName}</p>
              <p className="text-[12px] text-muted">
                {total} {total === 1 ? "product" : "products"} parsed
              </p>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2 text-[13px] font-medium">
              <span className="text-muted">Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={phase === "running"}
                className="bg-transparent font-semibold text-ink outline-none disabled:opacity-60"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {phase === "done" ? (
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-accent-strong"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                Export as CSV
              </button>
            ) : (
              <button
                type="button"
                onClick={runAll}
                disabled={phase === "running"}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phase === "running" ? "Generating…" : `Generate all (${total})`}
              </button>
            )}

            <button
              type="button"
              onClick={clearFile}
              disabled={phase === "running"}
              className="rounded-lg border border-line bg-surface p-2 text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label="Remove file"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          {phase !== "idle" && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="font-medium text-ink">
                  {phase === "done" ? "Done" : "Generating…"} {progress} / {total}
                  {failures > 0 && <span className="ml-2 text-red-600">{failures} failed</span>}
                </span>
                <span className="font-mono text-muted">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview (before run) */}
      {rows.length > 0 && results.length === 0 && (
        <Section title="Preview" meta={`${total} rows`}>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-canvas">
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="w-10 px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Features</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2 font-mono text-[11.5px] text-muted">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.name || <span className="text-red-500">(empty)</span>}</td>
                    <td className="px-3 py-2 text-muted">{r.features || <span className="text-red-500">(empty)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Section title="Results" meta={`${results.length} generated${failures ? ` · ${failures} failed` : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">SEO description</th>
                  <th className="px-3 py-2 font-medium">Social posts</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-line/70 align-top last:border-0">
                    <td className="px-3 py-3 font-medium">
                      {r.name}
                      {r.error && (
                        <span className="mt-1 block rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-normal text-red-600">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] leading-relaxed text-ink/85">
                      {r.error ? (
                        <span className="text-red-600">{r.error}</span>
                      ) : (
                        <p className="line-clamp-4 max-w-md">{r.seoDescription}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {r.socialPosts.length > 0 ? (
                        <div className="space-y-1.5">
                          {r.socialPosts.map((p, j) => (
                            <div key={j} className="max-w-sm text-[12px] leading-snug">
                              <span className="font-mono text-[10px] uppercase tracking-wide text-accent-strong">
                                {p.label}
                              </span>{" "}
                              <span className="text-muted">{p.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,16,22,0.04)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {meta && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{meta}</span>}
      </div>
      {children}
    </section>
  );
}
