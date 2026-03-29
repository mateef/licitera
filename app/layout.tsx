import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Licitera",
  description: "A licitálás új korszaka.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "min-h-screen overflow-x-hidden antialiased",
          "bg-[#f6f8ff] text-slate-900",
          "flex flex-col",
        ].join(" ")}
      >
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8faff_0%,#eef4ff_42%,#f8f7ff_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.10),transparent_28%)]" />
          <div className="absolute -top-24 left-[-80px] h-[320px] w-[320px] rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute right-[-60px] top-[120px] h-[260px] w-[260px] rounded-full bg-fuchsia-400/16 blur-3xl" />
          <div className="absolute bottom-[-100px] left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-indigo-300/14 blur-3xl" />
        </div>

        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>

        <main className="relative w-full flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        <footer className="relative border-t border-slate-200/80 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
            <p className="bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-base font-semibold text-transparent sm:text-lg">
              A licitálás új korszaka.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Csak licit • Gyors • Átlátható
            </p>
          </div>
        </footer>

        <Toaster richColors />
      </body>
    </html>
  );
}