import type { Metadata } from "next";
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
          "min-h-screen antialiased relative overflow-x-hidden",
          "bg-gradient-to-br from-blue-100 via-white to-fuchsia-100",
          "flex flex-col",
        ].join(" ")}
      >
        {/* Brand háttér glow */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-48 -left-48 h-[650px] w-[650px] rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-48 -right-48 h-[650px] w-[650px] rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <SiteHeader />

        {/* MAIN */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          <div className="rounded-2xl bg-background/75 backdrop-blur-md border shadow-sm p-4 sm:p-6">
            {children}
          </div>
        </main>

        {/* FOOTER BRAND BLOKK */}
        <footer className="mt-10 border-t bg-background/60 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-10 text-center">
            <p className="text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              A licitálás új korszaka.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Csak licit • Gyors • Átlátható
            </p>
          </div>
        </footer>

        <Toaster richColors />
      </body>
    </html>
  );
}