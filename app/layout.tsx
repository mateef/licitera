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
          "min-h-screen antialiased relative overflow-x-hidden",
          "bg-[#040714] text-white",
          "flex flex-col",
        ].join(" ")}
      >
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>

        <main className="w-full flex-1">
          {children}
        </main>

        <footer className="border-t border-white/10 bg-black/20 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-10 text-center">
            <p className="text-base font-semibold text-white/90 sm:text-lg">
              A licitálás új korszaka.
            </p>
            <p className="mt-2 text-sm text-white/50">
              Csak licit • Gyors • Átlátható
            </p>
          </div>
        </footer>

        <Toaster richColors />
      </body>
    </html>
  );
}