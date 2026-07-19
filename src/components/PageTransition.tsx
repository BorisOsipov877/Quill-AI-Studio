"use client";

import { usePathname } from "next/navigation";

/**
 * Replays an enter animation on every route change. Keying on the pathname
 * remounts the subtree, which restarts the CSS animation — no library needed.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
