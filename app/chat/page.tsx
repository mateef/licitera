"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  MessageCircle,
  Lock,
  Clock3,
  UserRound,
} from "lucide-react";

type ChatThreadRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  created_at: string;
};

type ListingRow = {
  id: string;
  title: string;
  image_urls: string[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  public_display_name: string | null;
};

function toPublicName(fullName: string | null | undefined) {
  if (!fullName) return "Ismeretlen felhasználó";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ismeretlen felhasználó";
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [listingMap, setListingMap] = useState<Record<string, ListingRow>>({});
  const [profileMap, setProfileMap] = useState<Record<string, ProfileRow>>({});

  async function load() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const uid = session?.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setThreads([]);
      setListingMap({});
      setProfileMap({});
      setLoading(false);
      return;
    }

    const { data: threadRows, error } = await supabase
      .from("chat_threads")
      .select("id,listing_id,seller_id,buyer_id,created_at")
      .or(`seller_id.eq.${uid},buyer_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (error) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const rows = (threadRows ?? []) as ChatThreadRow[];
    setThreads(rows);

    const listingIds = Array.from(new Set(rows.map((x) => x.listing_id)));
    const otherUserIds = Array.from(
      new Set(rows.map((x) => (x.seller_id === uid ? x.buyer_id : x.seller_id)))
    );

    const [{ data: listings }, { data: profiles }] = await Promise.all([
      listingIds.length
        ? supabase.from("listings").select("id,title,image_urls").in("id", listingIds)
        : Promise.resolve({ data: [] as any[] }),
      otherUserIds.length
        ? supabase
            .from("profiles")
            .select("id,full_name,public_display_name")
            .in("id", otherUserIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nextListingMap: Record<string, ListingRow> = {};
    (listings ?? []).forEach((item: any) => {
      nextListingMap[item.id] = item;
    });

    const nextProfileMap: Record<string, ProfileRow> = {};
    (profiles ?? []).forEach((item: any) => {
      nextProfileMap[item.id] = item;
    });

    setListingMap(nextListingMap);
    setProfileMap(nextProfileMap);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(() => {
    return threads.map((thread) => {
      const otherUserId =
        thread.seller_id === userId ? thread.buyer_id : thread.seller_id;

      const otherProfile = profileMap[otherUserId];
      const listing = listingMap[thread.listing_id];

      return {
        ...thread,
        otherName:
          otherProfile?.public_display_name ||
          toPublicName(otherProfile?.full_name),
        listingTitle: listing?.title ?? "Ismeretlen hirdetés",
        listingImage: listing?.image_urls?.[0] ?? null,
      };
    });
  }, [threads, userId, profileMap, listingMap]);

  if (!userId && !loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <MessageCircle className="h-7 w-7 text-slate-600" />
            </div>
            <h1 className="mt-5 text-center text-2xl font-black tracking-tight text-slate-900">
              Jelentkezz be a chathez
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-slate-500">
              A sikeres adás-vételek utáni beszélgetések csak bejelentkezett felhasználóknak érhetők el.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild className="rounded-full px-6">
                <a href="/login">Belépés</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-4 w-4" />
              Privát tranzakciós beszélgetések
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Chat
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Itt találod az összes sikeres adás-vétel utáni beszélgetésedet. Innen tudsz egyeztetni az átvételről, szállításról és a további részletekről.
            </p>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Beszélgetések</div>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {loading ? "..." : enriched.length}
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Állapot</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {loading ? "Betöltés..." : "Aktív"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Beszélgetések betöltése...
            </div>
          ) : enriched.length === 0 ? (
            <div className="rounded-[1.5rem] border bg-slate-50 p-8 text-center">
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                <MessageCircle className="h-6 w-6 text-slate-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900">
                Még nincs beszélgetésed
              </div>
              <div className="mt-2 text-sm text-slate-500">
                A sikeres villámáras vagy lezárt aukciók után itt jelennek meg a chatjeid.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {enriched.map((thread) => (
                <a
                  key={thread.id}
                  href={`/chat/${thread.id}`}
                  className="group flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-4"
                >
                  {thread.listingImage ? (
                    <img
                      src={thread.listingImage}
                      alt={thread.listingTitle}
                      className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 sm:h-24 sm:w-24">
                      <MessageCircle className="h-5 w-5 text-slate-500" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-base font-semibold text-slate-900 sm:text-lg">
                      {thread.listingTitle}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                        <UserRound className="h-4 w-4" />
                        {thread.otherName}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                        <Clock3 className="h-4 w-4" />
                        {formatDate(thread.created_at)}
                      </span>
                    </div>

                    <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      Sikeres tranzakció utáni beszélgetés
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}