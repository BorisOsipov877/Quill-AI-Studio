import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import Toaster from "@/components/Toaster";
import { getGenerationsCountSafe } from "@/lib/generations";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quill — AI Content Studio",
  description:
    "Generate SEO product descriptions and social posts in seconds. Pick a tone, describe your product, and let Quill write.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const historyCount = await getGenerationsCountSafe();

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-canvas text-ink">
        <AmbientOrbs />
        <div className="relative z-10">
          <Header historyCount={historyCount} />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

/* Decorative violet glow blobs behind the app. */
function AmbientOrbs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="orb-1 absolute -right-[120px] -top-[160px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(124,108,255,0.22),rgba(124,108,255,0.05)_55%,transparent_72%)] blur-[60px]" />
      <div className="orb-2 absolute -bottom-[200px] -left-[140px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_60%_40%,rgba(96,88,180,0.16),rgba(76,140,220,0.05)_55%,transparent_72%)] blur-[70px]" />
      <div className="absolute left-[55%] top-[35%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(124,108,255,0.08),transparent_65%)] blur-[50px]" />
    </div>
  );
}
