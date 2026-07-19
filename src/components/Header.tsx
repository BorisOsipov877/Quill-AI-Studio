"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Generate" },
  { href: "/batch", label: "Batch" },
  { href: "/brand-voice", label: "Brand voice" },
  { href: "/history", label: "History" },
  { href: "/analytics", label: "Analytics" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Header({ historyCount = 0 }: { historyCount?: number }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-[82px] items-center gap-6 border-b border-line bg-[#0c0c12]/[0.72] px-5 backdrop-blur-2xl sm:gap-10 sm:px-10">
      <Link href="/" className="flex flex-none items-center gap-2.5">
        <LogoMark />
        <span className="text-[17px] font-bold tracking-[-0.01em]">Quill</span>
        <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint sm:inline">
          AI Studio
        </span>
      </Link>

      <nav className="flex flex-1 items-center gap-2 overflow-x-auto">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              // Colours, border and glow come from `.tab-link` / `.tab-active`
              // in globals.css; `tab-active` also replays the activation pop.
              className={`tab-link flex flex-none items-center gap-2 rounded-[10px] px-5 py-2.5 text-[15px] font-medium ${
                active ? "tab-active" : ""
              }`}
            >
              {item.label}
              {item.href === "/history" && historyCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums transition-colors duration-300 ${
                    active ? "bg-accent/25 text-accent-strong" : "bg-white/[0.07] text-faint"
                  }`}
                >
                  {historyCount > 99 ? "99+" : historyCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <StatusPill />
    </header>
  );
}

function StatusPill() {
  return (
    <div className="hidden flex-none items-center gap-2 rounded-full border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.06)] px-3.5 py-1.5 shadow-[0_0_14px_rgba(74,222,128,0.1)] md:flex">
      <span className="h-[7px] w-[7px] rounded-full bg-ok shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8fe3ae]">Ready</span>
    </div>
  );
}

function LogoMark() {
  return (
    <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-gradient-to-br from-[#8b7cff] to-[#6250ee] shadow-[0_0_18px_rgba(124,108,255,0.45),inset_0_1px_0_rgba(255,255,255,0.35),0_4px_10px_rgba(0,0,0,0.4)]">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path
          d="M3 12L12 3M12 3H6M12 3V9"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
