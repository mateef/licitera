"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // sync input with URL (?q=...)
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange(() =>
      supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user?.id ?? null))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  function goListingsWithParams(params: URLSearchParams) {
    const url = `/listings?${params.toString()}`;

    // ha már /listings-en vagyunk, a push néha nem triggerel újratöltést
    if (pathname === "/listings") {
      router.replace(url);
      router.refresh();
    } else {
      router.push(url);
    }
  }

  function goSearch() {
    const q = search.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (q) params.set("q", q);
    else params.delete("q");

    goListingsWithParams(params);
  }

  function goHomeListings() {
    // katt a logóra: q-t is töröljük, hogy tuti legyen “minden aukció”
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    goListingsWithParams(params);
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      {/* Top mini bar (eBay feeling) */}
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Üdvözöllek!</span>
          {sessionUserId ? (
            <span className="text-foreground">Bejelentkezve ✅</span>
          ) : (
            <a className="hover:underline" href="/login">
              Jelentkezz be
            </a>
          )}
        </div>

        <div className="flex items-center gap-4">
          <a className="hover:underline" href="/my-listings">
            Saját aukciók
          </a>
          <a className="hover:underline" href="/create-listing">
            Eladás
          </a>
          <a className="hover:underline" href="/watchlist">
            Figyelőlista
          </a>
        </div>
      </div>

      <Separator />

      {/* Main bar */}
<div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
  {/* BAL: logo + mini szöveg fix szélesség */}
  <a href="/listings" className="flex items-center gap-3 shrink-0">
    <div className="text-2xl font-bold tracking-tight leading-none">
      <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
        Licitera
      </span>
    </div>

    <div className="hidden lg:block text-xs text-muted-foreground leading-4">
      Aukciók
      <br />
      licitre
    </div>
  </a>

  {/* KÖZÉP: search BALRÓL indul, kitölti a helyet */}
  <div className="flex-1 flex items-center">
    <form
      className="flex w-full max-w-2xl items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        goSearch();
      }}
    >
      <Input
        placeholder="Keress aukciót…"
        className="h-11 rounded-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Button type="submit" className="h-11 rounded-full px-5">
        Keresés
      </Button>
    </form>
  </div>

  {/* JOBB: kategóriák */}
  <div className="shrink-0">
    {mounted ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-11 rounded-full">
            Kategóriák
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push("/listings")}>Összes</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Button variant="outline" className="h-11 rounded-full" disabled>
        Kategóriák
      </Button>
    )}
  </div>
</div>
    </header>
  );
}