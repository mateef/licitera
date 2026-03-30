"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MessageCircle } from "lucide-react";
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
  Sparkles,
  Plus,
  Compass,
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
  const { unreadLabel, hasUnread } = useUnreadChatCount();

  const [search, setSearch] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mainCategories, setMainCategories] = useState<CategoryRow[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  if (pathname === "/") {
    return null;
  }

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    function onScroll() {
      setIsCompact(window.scrollY > 40);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-2xl">
      <div
        className={`transition-all duration-300 ${
          isCompact ? "shadow-[0_12px_34px_rgba(15,23,42,0.07)]" : ""
        }`}
      >
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isCompact ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-12 items-center justify-between gap-3 py-2 text-xs text-slate-500">
              <div className="min-w-0 truncate">
                {sessionUserId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700">
                      Üdv{displayName ? `, ${displayName}` : ""}!
                    </span>
                    <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex">
                      Licitera fiók aktív
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="hidden text-slate-500 sm:inline">
                      Az aukciók böngészése regisztráció nélkül is elérhető
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                      <Compass className="h-3 w-3" />
                      Szabad böngészés
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {sessionUserId && balance !== null ? (
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
                ) : (
                  <span className="hidden rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
                    Licitáláshoz bejelentkezés szükséges
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />
        </div>

        <div
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
            isCompact ? "py-2" : "py-3"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/listings")}
              className="group min-w-0 shrink-0 text-left"
            >
              <div
                className={`font-black leading-none tracking-tight transition-all duration-300 ${
                  isCompact ? "text-[1.35rem] sm:text-[1.55rem]" : "text-[1.85rem] sm:text-[2.05rem]"
                }`}
              >
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Licitera
                </span>
              </div>

              <div
                className={`hidden overflow-hidden text-xs text-slate-500 transition-all duration-300 sm:block ${
                  isCompact ? "max-h-0 opacity-0" : "mt-0.5 max-h-10 opacity-100"
                }`}
              >
                A licitálás új korszaka
              </div>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="shrink-0">
                <NotificationsBell />
              </div>

              {sessionUserId ? (
                <button
                  onClick={() => router.push("/chat")}
                  className={`relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] ${
                    isCompact ? "h-10 w-10" : "h-11 w-11"
                  }`}
                  aria-label="Chat"
                  title="Chat"
                >
                  <MessageCircle className="h-4 w-4" />

                  {hasUnread ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                      {unreadLabel}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {sessionUserId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] ${
                        isCompact ? "h-10 px-3" : "h-11 px-4"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      <span
                        className={`truncate transition-all duration-300 ${
                          isCompact ? "max-w-[56px]" : "max-w-[84px]"
                        }`}
                      >
                        {displayName || "Profil"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                    {isAdmin ? (
                      <DropdownMenuItem
                        onClick={() => router.push("/admin")}
                        className="rounded-xl py-3"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Admin felület
                      </DropdownMenuItem>
                    ) : null}

                    <DropdownMenuItem
                      onClick={() => router.push("/profile")}
                      className="rounded-xl py-3"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profil
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => router.push("/chat")}
                      className="rounded-xl py-3"
                    >
                      <div className="relative mr-2">
                        <MessageCircle className="h-4 w-4" />
                        {hasUnread ? (
                          <span className="absolute -right-2 -top-2 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                            {unreadLabel}
                          </span>
                        ) : null}
                      </div>
                      Chat
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
                <>
                  <Button
                    variant="outline"
                    className={`${isCompact ? "h-10 px-3" : "h-11 px-4"} hidden rounded-full border-slate-200 bg-white sm:inline-flex`}
                    onClick={() => router.push("/register")}
                  >
                    Regisztráció
                  </Button>

                  <Button
                    className={`${isCompact ? "h-10 px-3" : "h-11 px-4"} rounded-full`}
                    onClick={() => router.push("/login")}
                  >
                    Belépés
                  </Button>
                </>
              )}

              <Button
                className={`${isCompact ? "h-10 px-3" : "h-11 px-4"} rounded-full shadow-sm`}
                onClick={() =>
                  sessionUserId ? router.push("/create-listing") : router.push("/login")
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Eladás</span>
                <span className="hidden sm:inline">Aukció feladása</span>
              </Button>
            </div>
          </div>

          <div
            className={`grid overflow-hidden transition-all duration-300 lg:grid-cols-[1fr_auto] ${
              isCompact
                ? "mt-2 max-h-14 gap-2 opacity-100"
                : "mt-4 max-h-40 gap-3 opacity-100"
            }`}
          >
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                goSearch();
              }}
            >
              <Input
                placeholder={
                  isCompact
                    ? "Keresés..."
                    : "Keress aukciót, kategóriát vagy kulcsszót..."
                }
                className={`rounded-full border-slate-200 bg-white pl-5 pr-14 text-sm shadow-sm transition ${
                  isCompact
                    ? "h-10 focus-visible:ring-1 focus-visible:ring-slate-300"
                    : "h-12 focus-visible:ring-2 focus-visible:ring-slate-300"
                }`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="submit"
                aria-label="Keresés"
                className={`absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.97] ${
                  isCompact ? "h-8 w-8" : "h-9 w-9"
                }`}
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            <div
              className={`flex items-center gap-2 overflow-x-auto pb-1 lg:justify-end ${
                isCompact ? "hidden sm:flex" : "flex"
              }`}
            >
              <Button
                variant="outline"
                className={`shrink-0 rounded-full border-slate-200 bg-white px-4 shadow-sm ${
                  isCompact ? "h-10" : "h-11"
                }`}
                onClick={() => router.push("/listings")}
              >
                Összes aukció
              </Button>

              {mounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] ${
                        isCompact ? "h-10" : "h-11"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Kategóriák
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="max-h-[70vh] w-64 overflow-y-auto rounded-2xl p-2"
                  >
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
              ) : null}
            </div>
          </div>

          {!sessionUserId && !isCompact ? (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:hidden">
              <Button
                variant="outline"
                className="h-10 shrink-0 rounded-full"
                onClick={() => router.push("/register")}
              >
                Regisztráció
              </Button>
              <Button
                variant="outline"
                className="h-10 shrink-0 rounded-full"
                onClick={() => router.push("/login")}
              >
                Belépés
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}