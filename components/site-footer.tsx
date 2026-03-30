"use client";

import type { LucideIcon } from "lucide-react";
import {
  Facebook,
  Instagram,
  LifeBuoy,
  Mail,
  Shield,
  FileText,
  HelpCircle,
  ChevronRight,
  Gavel,
  Heart,
  Wallet,
  User,
} from "lucide-react";

type FooterLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const footerColumns: FooterColumn[] = [
  {
    title: "Használat",
    links: [
      { label: "Regisztráció", href: "/register", icon: User },
      { label: "Belépés", href: "/login", icon: User },
      { label: "Összes aukció", href: "/listings", icon: Gavel },
      { label: "Hirdetésfeladás", href: "/create-listing", icon: ChevronRight },
    ],
  },
  {
    title: "Fiók és aukciók",
    links: [
      { label: "Figyelőlista", href: "/watchlist", icon: Heart },
      { label: "Saját aukciók", href: "/my-listings", icon: Gavel },
      { label: "Profil", href: "/profile", icon: User },
      { label: "Egyenleg és előfizetés", href: "/billing", icon: Wallet },
    ],
  },
  {
    title: "Segítség",
    links: [
      { label: "Segítség / GYIK", href: "/help", icon: HelpCircle },
      { label: "Hiba jelentése", href: "/support/report-error", icon: LifeBuoy },
      { label: "Kapcsolat", href: "mailto:fmate2000@gmail.com", icon: Mail },
    ],
  },
  {
    title: "Jogi információk",
    links: [
      { label: "Általános Szerződési Feltételek", href: "/legal/aszf", icon: FileText },
      { label: "Adatkezelési tájékoztató", href: "/legal/privacy", icon: Shield },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-14 border-t border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 xl:grid-cols-[1.15fr_1fr]">
          <div className="max-w-xl">
            <div className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Licitera
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Modern aukciós platform, ahol regisztráció nélkül is böngészhetsz,
              fiókkal pedig licitálhatsz, figyelőlistát használhatsz, és sikeres
              tranzakció után közvetlenül kapcsolatba léphetsz a másik féllel.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="/listings"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Aukciók böngészése
              </a>

              <a
                href="/register"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Regisztráció
              </a>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <a
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>

              <a
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-sm font-bold text-slate-900">Licitera</div>
              <div className="mt-1 text-sm text-slate-600">
                A licitálás új korszaka.
              </div>
              <div className="mt-2 text-xs leading-6 text-slate-500">
                Csak licit • Gyors • Átlátható
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
                  {column.title}
                </h3>

                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => {
                    const Icon = link.icon;

                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="inline-flex items-start gap-2 text-sm leading-6 text-slate-600 transition hover:text-slate-900"
                        >
                          {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                          <span>{link.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>© 2026 Licitera. Minden jog fenntartva.</div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href="/legal/aszf" className="transition hover:text-slate-900">
                Felhasználási feltételek
              </a>
              <a href="/legal/privacy" className="transition hover:text-slate-900">
                Adatvédelem
              </a>
              <a href="/help" className="transition hover:text-slate-900">
                Súgó
              </a>
              <a href="/support/report-error" className="transition hover:text-slate-900">
                Hiba jelentése
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}