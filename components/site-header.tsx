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
import { toast } from "sonner";
import { NotificationsBell } from "@/components/notifications-bell";

type ProfileRow = {
  full_name: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
};

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mainCategories, setMainCategories] = useState<CategoryRow[]>([]);
  const [balance, setBalance] = useState<number | null>(null);

  if (pathname === "/") {
    return null;
  }

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  function getHungarianFirstName(fullName: string | null | undefined) {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  async function loadMainCategories() {
    const { data } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    setMainCategories((data ?? []) as CategoryRow[]);
  }

  async function loadBalance(userId: string | null) {
    if (!userId) {
      setBalance(null);
      return;
    }

    const { data } = await supabase
      .from("billing_user_balances")
      .select("balance_amount")
      .eq("user_id", userId)
      .maybeSingle();

    const raw = (data as any)?.balance_amount ?? 0;

    // 💡 NEM engedjük +ba
    setBalance(Math.min(0, raw));
  }

  async function loadSessionAndProfile() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    const userId = user?.id ?? null;
    const userEmail = user?.email ?? "";

    setSessionUserId(userId);
    setIsAdmin(userEmail === "fmate2000@gmail.com");

    if (!userId) {
      setDisplayName("");
      setBalance(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const profileRow = profile as ProfileRow | null;
    setDisplayName(getHungarianFirstName(profileRow?.full_name));

    await loadBalance(userId);
  }

  useEffect(() => {
    setMounted(true);
    loadSessionAndProfile();
    loadMainCategories();

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Kijelentkeztél.");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur-xl">
      {/* TOP BAR */}
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        <div>
          {sessionUserId ? (
            <span className="text-foreground">
              Üdv{displayName ? `, ${displayName}` : ""}!
            </span>
          ) : (
            <a className="hover:underline" href="/login">
              A belépéshez kattints ide
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {sessionUserId && balance !== null && (
            <button
              onClick={() => router.push("/billing")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                balance < 0
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {balance < 0 ? "⚠ " : ""}
              {new Intl.NumberFormat("hu-HU").format(balance)} Ft
            </button>
          )}

          {sessionUserId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-xs hover:text-foreground">
                  Profil ▼
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    Admin felület
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  Profil
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/billing")}>
                  Egyenleg & előfizetés
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/my-listings")}>
                  Saját aukciók
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/watchlist")}>
                  Figyelőlista
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleSignOut}>
                  Kijelentkezés
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <a className="hover:underline" href="/my-listings">
                Saját aukciók
              </a>
              <a className="hover:underline" href="/create-listing">
                Eladás
              </a>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* MAIN HEADER */}
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2">
        <button
          onClick={() => router.push("/listings")}
          className="text-2xl font-extrabold tracking-tight"
        >
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Licitera
          </span>
        </button>

        <div className="hidden text-xs text-muted-foreground md:block">
          Aukciók
          <br />
          licitre
        </div>

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
            <Button type="submit" className="h-11 rounded-full px-4">
              🔎
            </Button>
          </form>

          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden h-11 rounded-full md:inline-flex">
                  Kategóriák
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/listings")}>
                  Összes kategória
                </DropdownMenuItem>

                {mainCategories.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => router.push(`/listings?category=${c.id}`)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <NotificationsBell />

          <Button
            className="h-11 rounded-full px-4"
            onClick={() => router.push("/create-listing")}
          >
            + Aukció
          </Button>
        </div>
      </div>
    </header>
  );
}