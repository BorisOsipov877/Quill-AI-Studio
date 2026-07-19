"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// false during SSR / before hydration, true on the client — without a
// setState-in-effect (recharts renders nothing meaningful server-side).
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export interface ContentTypeDatum {
  type: string;
  count: number;
  fill: string;
}

// Ink tokens from the validated data-viz palette (dark surface).
const TEXT_SECONDARY = "#c3c2b7";
const SURFACE = "#16161f";
const BORDER = "rgba(255,255,255,0.10)";

export default function ContentTypeChart({ data }: { data: ContentTypeDatum[] }) {
  // Mount-guard avoids a hydration mismatch and keeps the layout height stable.
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[200px] w-full" />;

  return (
    <div className="relative h-[200px] w-full">
      {/* Per-series glow, so the bars sit in the same lit style as the rest of
          the UI instead of reading as a default chart. */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          {data.map((d, i) => (
            <filter key={i} id={`bar-glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={d.fill} floodOpacity="0.6" />
            </filter>
          ))}
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
          barCategoryGap={16}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="type"
            width={140}
            tickLine={false}
            axisLine={false}
            tick={{ fill: TEXT_SECONDARY, fontSize: 12.5 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              boxShadow: "0 4px 16px -6px rgba(16,16,22,0.18)",
              fontSize: 12.5,
              padding: "6px 10px",
            }}
            labelStyle={{ color: "#17171c", fontWeight: 600, marginBottom: 2 }}
            itemStyle={{ color: TEXT_SECONDARY }}
            formatter={(value) => [`${value} pieces`, "Count"]}
          />
          <Bar
            dataKey="count"
            barSize={16}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            background={{ fill: "rgba(255,255,255,0.04)", radius: 4 }}
          >
            {data.map((d, i) => (
              <Cell key={d.type} fill={d.fill} filter={`url(#bar-glow-${i})`} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              fill={TEXT_SECONDARY}
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
