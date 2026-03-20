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
import {
  Search,
  ChevronDown,
  LayoutGrid,
  User,
  Gavel,
  Wallet,
  Heart,
  Shield,
  LogOut,
} from "lucide-react";

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

    const raw = Number((data as any)?.balance_amount ?? 0);
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

    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }

    router.push(`/listings?${params.toString()}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Kijelentkeztél.");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-2xl">
      {/* TOP INFO BAR */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex min-h-11 items-center justify-between gap-3 py-2 text-xs text-slate-500">
          <div className="min-w-0 truncate">
            {sessionUserId ? (
              <span className="text-slate-700">
                Üdv{displayName ? `, ${displayName}` : ""}!
              </span>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="font-medium text-slate-700 transition hover:text-slate-900"
              >
                Belépés / regisztráció
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {sessionUserId && balance !== null && (
              <button
                onClick={() => router.push("/billing")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  balance < 0
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {balance < 0 ? "⚠ " : ""}
                {new Intl.NumberFormat("hu-HU").format(balance)} Ft
              </button>
            )}

            {!sessionUserId && (
              <button
                onClick={() => router.push("/create-listing")}
                className="hidden rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
              >
                Eladás indítása
              </button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* MAIN */}
      <div className="mx-auto max-w-6xl px-4 py-3">
        {/* ROW 1 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/listings")}
            className="group min-w-0 shrink-0 text-left"
          >
            <div className="text-[1.8rem] font-black leading-none tracking-tight sm:text-[2rem]">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Licitera
              </span>
            </div>
            <div className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              Aukciók licitre
            </div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="shrink-0">
              <NotificationsBell />
            </div>

            {sessionUserId ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
                    <User className="h-4 w-4" />
                    <span className="max-w-[84px] truncate">
                      {displayName || "Profil"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => router.push("/admin")}
                      className="rounded-xl py-3"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Admin felület
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="rounded-xl py-3"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => router.push("/billing")}
                    className="rounded-xl py-3"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Egyenleg & előfizetés
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => router.push("/my-listings")}
                    className="rounded-xl py-3"
                  >
                    <Gavel className="mr-2 h-4 w-4" />
                    Saját aukciók
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => router.push("/watchlist")}
                    className="rounded-xl py-3"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Figyelőlista
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="rounded-xl py-3 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Kijelentkezés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className="h-11 rounded-full px-4"
                onClick={() => router.push("/login")}
              >
                Belépés
              </Button>
            )}

            <Button
              className="h-11 rounded-full px-4 shadow-sm"
              onClick={() => router.push("/create-listing")}
            >
              <span className="sm:hidden">+ Eladás</span>
              <span className="hidden sm:inline">+ Aukció</span>
            </Button>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              goSearch();
            }}
          >
            <Input
              placeholder="Keress aukciót, kategóriát vagy kulcsszót..."
              className="h-12 rounded-full border-slate-200 bg-white pl-5 pr-14 text-sm shadow-sm transition focus-visible:ring-2 focus-visible:ring-slate-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Keresés"
              className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.97]"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:justify-end">
            <Button
              variant="outline"
              className="h-11 shrink-0 rounded-full border-slate-200 bg-white px-4 shadow-sm"
              onClick={() => router.push("/listings")}
            >
              Összes aukció
            </Button>

            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
                    <LayoutGrid className="h-4 w-4" />
                    Kategóriák
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto rounded-2xl p-2">
                  <DropdownMenuItem
                    onClick={() => router.push("/listings")}
                    className="rounded-xl py-3"
                  >
                    Összes kategória
                  </DropdownMenuItem>

                  {mainCategories.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => router.push(`/listings?category=${c.id}`)}
                      className="rounded-xl py-3"
                    >
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* MOBILE QUICK LINKS FOR GUESTS */}
        {!sessionUserId && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:hidden">
            <Button
              variant="outline"
              className="h-10 shrink-0 rounded-full"
              onClick={() => router.push("/my-listings")}
            >
              Saját aukciók
            </Button>
            <Button
              variant="outline"
              className="h-10 shrink-0 rounded-full"
              onClick={() => router.push("/watchlist")}
            >
              Figyelőlista
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}