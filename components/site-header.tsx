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

  if (pathname === "/") {
    return null;
  }

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  function getHungarianFirstName(fullName: string | null | undefined) {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    return parts[parts.length - 1] || "";
  }

  async function loadMainCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setMainCategories([]);
      return;
    }

    setMainCategories((data ?? []) as CategoryRow[]);
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
      if (!userEmail) setIsAdmin(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const profileRow = profile as ProfileRow | null;
    setDisplayName(getHungarianFirstName(profileRow?.full_name));
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
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {sessionUserId ? (
            <span className="text-foreground">
              Üdvözöllek{displayName ? `, ${displayName}!` : "!"}
            </span>
          ) : (
            <a className="hover:underline" href="/login">
              A belépéshez kattints ide
            </a>
          )}
        </div>

        <div className="flex items-center gap-4">
          {sessionUserId ? (
            <>
              {isAdmin ? (
                <a className="hover:underline" href="/admin">
                  Admin felület
                </a>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Profil ▼
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  {isAdmin ? (
                    <DropdownMenuItem onClick={() => router.push("/admin")}>
                      Admin felület
                    </DropdownMenuItem>
                  ) : null}

                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    Profil
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
            </>
          ) : (
            <>
              <a className="hover:underline" href="/my-listings">
                Saját aukciók
              </a>
              <a className="hover:underline" href="/create-listing">
                Eladás
              </a>
              <a className="hover:underline" href="/watchlist">
                Figyelőlista
              </a>
            </>
          )}
        </div>
      </div>

      <Separator />

      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            router.push("/listings");
            router.refresh();
          }}
          className="shrink-0 text-2xl font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
            Licitera
          </span>
        </button>

        <div className="hidden text-xs leading-4 text-muted-foreground md:block">
          Aukciók
          <br />
          licitre
        </div>

        <div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              goSearch();
            }}
          >
            <Input
              placeholder="Keress aukciót..."
              className="h-11 min-w-0 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" className="h-11 shrink-0 rounded-full px-4 sm:px-6">
              🔎 Keresés
            </Button>
          </form>

          {mounted ? (
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

                {mainCategories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => router.push(`/listings?category=${category.id}`)}
                  >
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" className="hidden h-11 rounded-full md:inline-flex" disabled>
              Kategóriák
            </Button>
          )}

          {isAdmin ? (
            <Button
              variant="outline"
              className="hidden h-11 rounded-full lg:inline-flex"
              onClick={() => router.push("/admin")}
            >
              Admin felület
            </Button>
          ) : null}

          <NotificationsBell />

          <Button
            className="h-11 shrink-0 rounded-full px-4 sm:px-6"
            onClick={() => router.push("/create-listing")}
          >
            <span className="hidden sm:inline">+ Új aukció</span>
            <span className="sm:hidden">Eladás</span>
          </Button>
        </div>
      </div>
    </header>
  );
}