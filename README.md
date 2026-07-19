# Quill — AI Content Studio

An AI copywriting tool built with Next.js (App Router) + Tailwind CSS + Supabase + the Anthropic API. Enter a product, pick a tone of voice, and get an SEO product description plus three social posts (Instagram, LinkedIn, X) — each with a one-click Copy button. Every generation is saved to history.

## Stack

- Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 (Inter + Geist Mono, a clean Notion/Linear-style UI)
- Supabase (`@supabase/supabase-js`) — `content_generations` table
- Anthropic (`@anthropic-ai/sdk`) — `claude-sonnet-5` via a Server Action

## Generation

The app calls the **real Anthropic API** (`src/lib/generator/anthropic.ts`): `claude-sonnet-5` with structured outputs (`output_config.format`), so the response is guaranteed to match the expected JSON shape. API errors — invalid key, out of credit, rate limit, network — are mapped to friendly, user-facing messages.

**`ANTHROPIC_API_KEY` is required.** Without it, generation fails with "The Anthropic API key is not configured" rather than crashing; the rest of the app still works.

Generation sits behind a **single swap point** (`src/lib/generator/index.ts`). To develop the UI without spending API credit, flip it to the offline mock:

```ts
export const generateContent = mockGenerate;                 // was: anthropicGenerate
export const GENERATION_SOURCE: GenerationSource = "mock";   // was: "anthropic"
```

The mock (`src/lib/generator/mock.ts`) returns tone-aware placeholder copy after a ~1–2s simulated delay. Both functions share the identical signature `(input) => Promise<GeneratedContent>`, so nothing else changes.

> **Note on temperature:** the brief asked for a "moderate temperature", but `claude-sonnet-5` no longer accepts `temperature` / `top_p` / `top_k` (the API returns HTTP 400 for them). The real generator steers creativity through the system prompt instead; there's a comment at the call site in `anthropic.ts` explaining this.

## First run

1. Install dependencies and fill in `.env.local` (see `.env.local.example` as a template). `ANTHROPIC_API_KEY` is required for generation to work.

2. **Apply the database schema.** I don't have your Postgres password (only the Supabase API keys, which can't run DDL), so this one-time step is manual:
   - Supabase Dashboard → your project → **SQL Editor** → New query.
   - Paste [`supabase/schema.sql`](supabase/schema.sql) and run it. It creates `content_generations`, enables RLS, and adds a public-read policy.
   - Until you do this, generating still works — the result just shows a small "couldn't be saved to history" note, and `/history` shows a friendly setup message.

3. Run it:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## How it works

- **`/`** — the generator form (product name, key features, **product photo**, **Voice**, tone) posts to the `generateContentAction` Server Action (`src/app/actions.ts`). While it runs, a skeleton loader shows; the result renders below with Copy buttons on every block.
- **Product photo** — optional, instead of or alongside the text features. The chosen image is **downscaled to a small JPEG in the browser** (canvas, ~1200px, `src/lib/resize-image.ts`) and converted to base64, so the payload stays tiny and well under the Server Action body limit. When present, the real Anthropic branch sends it as an **image content block** with a "describe this product and generate content" prompt; a thumbnail preview shows before generation. Features become optional when a photo is attached. (The mock can't read images — it synthesizes generic features so it still returns plausible copy.)
- **Voice** — a dropdown of saved brand voices. Pick one and it **overrides the tone** (the tone select greys out). Leave it on "Use tone below" and it behaves exactly as before. The action resolves the selected voice id to a full profile and passes it to the generator; if the id can't be resolved it silently falls back to the tone.
- **`/brand-voice`** — create reusable voice profiles (name, style description, 3–5 example phrases, words to avoid). Saved to the `brand_voices` table and immediately available on the generator. Includes delete.
- The action calls `generateContent` (mock or real), then **best-effort** saves the generation to Supabase using the service-role key (writes bypass RLS). A DB failure never loses the generated result — it's still returned to the user.
- **`/batch`** — upload a CSV (`name`, `features` columns), preview the parsed rows, then **Generate all**. Rows are processed **sequentially** (one server-action round-trip at a time — never parallel, to stay under API rate limits) with a live progress bar; failed rows are recorded and the batch continues. The results table has **Export as CSV** (name, features, SEO, the three posts, status). Batch rows are **not** saved to history (a bulk run has its own export). CSV parsing/serialization is dependency-free (`src/lib/csv.ts`, handles quoted fields, embedded commas/newlines, escaped quotes).
- **`/history`** — lists recent generations (read with the public anon key). **`/history/[id]`** re-renders the full result.
- **`/analytics`** — total generations, a **content-type breakdown** (SEO descriptions, social posts, email — a **recharts** horizontal bar chart, `src/components/ContentTypeChart.tsx`), and an estimated **time saved** (5 minutes per piece of copy). Aggregated from `content_generations` (`src/lib/analytics.ts`). Email copy isn't generated by the tool yet, so it's shown at 0 for completeness. Chart colours come from the dataviz skill's validated categorical palette; the chart renders client-only behind a hydration guard.

## Data model & security

- `content_generations` and `brand_voices` — both publicly readable via RLS `select` policies; **writes only** via `SUPABASE_SERVICE_ROLE_KEY` (used exclusively in Server Actions, never shipped to the client).
- The Anthropic API key and Supabase service-role key are server-only — verified absent from the client bundle.
