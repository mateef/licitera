"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";

const APP_STORE_URL = "https://apps.apple.com/us/app/licitera/id6761125527s";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=hu.licitera.app";

const STORAGE_KEY = "licitera_mobile_app_banner_closed_until";
const HIDE_DAYS = 3;

type PlatformType = "ios" | "android" | "other";

function detectPlatform(): PlatformType {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";

  return "other";
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const navigatorStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  const mediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return navigatorStandalone || mediaStandalone;
}

function shouldHideBannerFromStorage() {
  if (typeof window === "undefined") return true;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  const until = Number(raw);
  if (!Number.isFinite(until)) return false;

  return Date.now() < until;
}

function closeBannerForDays() {
  if (typeof window === "undefined") return;

  const until = Date.now() + HIDE_DAYS * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(STORAGE_KEY, String(until));
}

export default function MobileAppBanner() {
  const [visible, setVisible] = useState(false);

  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    if (platform !== "android") {
      setVisible(false);
      return;
    }

    if (isStandaloneMode()) {
      setVisible(false);
      return;
    }

    if (shouldHideBannerFromStorage()) {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [platform]);

  if (!visible || platform !== "android") return null;

  return (
    <div className="sticky top-0 z-[70] border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-3 sm:px-6 lg:px-8">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Image
            src="/icon.png"
            alt="Licitera app ikon"
            fill
            sizes="44px"
            className="object-cover"
            priority
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-900">
            Licitera alkalmazás
          </div>
          <div className="line-clamp-2 text-xs leading-5 text-slate-600">
            Töltsd le Androidra a gyorsabb, kényelmesebb licitálási élményért.
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              closeBannerForDays();
              setVisible(false);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Banner bezárása"
          >
            <X className="h-4 w-4" />
          </button>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Letöltés
          </a>
        </div>
      </div>
    </div>
  );
}