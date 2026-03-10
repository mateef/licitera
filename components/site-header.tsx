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

type ProfileRow = {
  full_name: string | null;
};

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  if (pathname === "/") {
    return null;
  }

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  async function loadSessionAndProfile() {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;
    setSessionUserId(userId);

    if (!userId) {
      setFullName("");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const profileRow = profile as ProfileRow | null;
    const firstName = profileRow?.full_name?.trim()?.split(" ")[0] ?? "";
    setFullName(firstName);
  }

  useEffect(() => {
    setMounted(true);
    loadSessionAndProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadSessionAndProfile();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  function goSearch() {
    const q = search.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (q) params.set("q", q);
    else params.delete("q");

    router.push(`/listings?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {sessionUserId ? (
            <span className="text-foreground">
              Üdvözöllek{fullName ? `, ${fullName}!` : "!"}
            </span>
          ) : (
            <a className="hover:underline" href="/login">
              A belépéshez kattints ide
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

      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => {
            router.push("/listings");
            router.refresh();
          }}
          className="text-2xl font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
            Licitera
          </span>
        </button>

        <div className="ml-2 flex flex-1 items-center gap-2">
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              goSearch();
            }}
          >
            <Input
              placeholder="Keress aukciót..."
              className="h-11 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" className="h-11 rounded-full px-6">
              Keresés
            </Button>
          </form>

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 rounded-full">
                  Kategóriák
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/listings")}>
                  Összes
                </DropdownMenuItem>
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