"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock3,
  Lock,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type ChatThreadRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  created_at: string;
};

type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
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

export default function ChatThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThreadRow | null>(null);
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [otherUserName, setOtherUserName] = useState("");
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const uid = session?.user?.id ?? null;
    setUserId(uid);

    if (!uid || !threadId) {
      setLoading(false);
      return;
    }

    const [{ data: threadRow }, { data: msgRows }] = await Promise.all([
      supabase
        .from("chat_threads")
        .select("id,listing_id,seller_id,buyer_id,created_at")
        .eq("id", threadId)
        .maybeSingle(),
      supabase
        .from("chat_messages")
        .select("id,thread_id,sender_id,message,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true }),
    ]);

    const resolvedThread = (threadRow as ChatThreadRow | null) ?? null;
    setThread(resolvedThread);
    setMessages((msgRows ?? []) as ChatMessageRow[]);

    if (resolvedThread) {
      const otherUserId =
        resolvedThread.seller_id === uid
          ? resolvedThread.buyer_id
          : resolvedThread.seller_id;

      const [{ data: listingRow }, { data: profileRow }] = await Promise.all([
        supabase
          .from("listings")
          .select("id,title,image_urls")
          .eq("id", resolvedThread.listing_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id,full_name,public_display_name")
          .eq("id", otherUserId)
          .maybeSingle(),
      ]);

      setListing((listingRow as ListingRow | null) ?? null);

      const p = profileRow as ProfileRow | null;
      setOtherUserName(
        p?.public_display_name || toPublicName(p?.full_name)
      );
    } else {
      setListing(null);
      setOtherUserName("");
    }

    setLoading(false);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 80);
  }

  useEffect(() => {
    load();

    if (!threadId) return;

    const channel = supabase
      .channel(`web-chat-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async () => {
          await load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const canSend = useMemo(
    () => !!text.trim() && !!userId && !!thread,
    [text, userId, thread]
  );

  async function handleSend() {
    if (!canSend || !userId || !threadId) return;

    setSending(true);

    const clean = text.trim();

    const { error } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      sender_id: userId,
      message: clean,
    });

    setSending(false);

    if (!error) {
      setText("");
      await load();
    }
  }

  if (!userId && !loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[2rem]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <MessageCircle className="h-7 w-7 text-slate-600" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              Jelentkezz be a chathez
            </h1>
            <div className="mt-6">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-4 w-4" />
              Privát tranzakciós beszélgetés
            </div>

            <h1 className="mt-4 line-clamp-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {listing?.title ?? "Beszélgetés"}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <UserRound className="h-4 w-4" />
                {otherUserName || "Betöltés..."}
              </span>

              {thread?.created_at ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                  <Clock3 className="h-4 w-4" />
                  {formatDate(thread.created_at)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" asChild>
              <a href="/chat">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Vissza
              </a>
            </Button>

            {listing?.id ? (
              <Button className="rounded-full" asChild>
                <a href={`/listing/${listing.id}`}>Hirdetés megnyitása</a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <CardContent className="p-0">
          <div className="border-b bg-slate-50/90 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              A beszélgetés elején megjelennek a kapcsolattartási adatok és a tranzakció összegzése.
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.04),transparent_30%),white] px-4 py-5 sm:px-6">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Üzenetek betöltése...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Még nincs üzenet.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const mine = msg.sender_id === userId;
                  const isSystem =
                    msg.message.startsWith("✅") || msg.message.startsWith("🔐");

                  return (
                    <div
                      key={msg.id}
                      className={[
                        "flex",
                        isSystem
                          ? "justify-stretch"
                          : mine
                          ? "justify-end"
                          : "justify-start",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "rounded-[1.4rem] px-4 py-3 text-sm leading-6",
                          isSystem
                            ? "w-full border border-slate-200 bg-slate-50 text-slate-700"
                            : mine
                            ? "max-w-[85%] bg-slate-900 text-white"
                            : "max-w-[85%] border border-slate-200 bg-white text-slate-800",
                        ].join(" ")}
                      >
                        <div className="whitespace-pre-line">{msg.message}</div>
                        <div
                          className={[
                            "mt-2 text-[11px]",
                            mine && !isSystem ? "text-slate-300" : "text-slate-500",
                          ].join(" ")}
                        >
                          {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Írj üzenetet..."
                className="min-h-[56px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300"
              />
              <Button
                onClick={handleSend}
                disabled={!canSend || sending}
                className="rounded-2xl px-5 sm:self-end"
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Küldés..." : "Küldés"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}