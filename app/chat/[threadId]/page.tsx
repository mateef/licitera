"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Star,
  UserRound,
  X,
} from "lucide-react";

type ChatThreadRow = {
  id: string;
  listing_id: string | null;
  seller_id: string | null;
  buyer_id: string | null;
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
  title: string | null;
  image_urls: string[] | null;
  closed_at: string | null;
  winner_user_id: string | null;
  user_id: string | null;
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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatThreadPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = typeof params?.threadId === "string" ? params.threadId : "";
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThreadRow | null>(null);
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [otherUserName, setOtherUserName] = useState("Másik fél");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");

  function scrollToBottom() {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }

  async function markAsRead(threadIdValue: string, userIdValue: string) {
    const nowIso = new Date().toISOString();

    const { data: existing } = await supabase
      .from("chat_thread_members")
      .select("thread_id,user_id")
      .eq("thread_id", threadIdValue)
      .eq("user_id", userIdValue)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("chat_thread_members")
        .update({ last_read_at: nowIso })
        .eq("thread_id", threadIdValue)
        .eq("user_id", userIdValue);
      return;
    }

    await supabase.from("chat_thread_members").insert({
      thread_id: threadIdValue,
      user_id: userIdValue,
      last_read_at: nowIso,
    });
  }

  async function loadReadStatus(threadIdValue: string, currentUserId: string) {
    const { data } = await supabase
      .from("chat_thread_members")
      .select("user_id,last_read_at")
      .eq("thread_id", threadIdValue);

    const other = (data ?? []).find((row: any) => row.user_id !== currentUserId);
    setOtherUserLastReadAt(other?.last_read_at ?? null);
  }

  async function loadReviewState(
    listingRow: ListingRow | null,
    currentUserId: string,
    reviewedUserId: string | null
  ) {
    if (!listingRow?.id || !reviewedUserId) {
      setCanReview(false);
      setAlreadyReviewed(false);
      return;
    }

    const { data: canReviewData } = await supabase.rpc("can_review_listing", {
      p_listing_id: listingRow.id,
      p_reviewed_user_id: reviewedUserId,
    });

    setCanReview(!!canReviewData);

    const { data: existingReview } = await supabase
      .from("listing_reviews")
      .select("id")
      .eq("listing_id", listingRow.id)
      .eq("reviewer_user_id", currentUserId)
      .eq("reviewed_user_id", reviewedUserId)
      .maybeSingle();

    setAlreadyReviewed(!!existingReview);
  }

  async function load() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (!uid || !threadId) {
        setThread(null);
        setListing(null);
        setMessages([]);
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

      if (!resolvedThread) {
        setListing(null);
        setOtherUserId(null);
        setOtherUserName("Másik fél");
        setCanReview(false);
        setAlreadyReviewed(false);
        setLoading(false);
        return;
      }

      const resolvedOtherUserId =
        resolvedThread.seller_id === uid ? resolvedThread.buyer_id : resolvedThread.seller_id;

      setOtherUserId(resolvedOtherUserId ?? null);

      const [{ data: listingRow }, { data: profileRow }] = await Promise.all([
        resolvedThread.listing_id
          ? supabase
              .from("listings")
              .select("id,title,image_urls,closed_at,winner_user_id,user_id")
              .eq("id", resolvedThread.listing_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        resolvedOtherUserId
          ? supabase
              .from("profiles")
              .select("id,full_name,public_display_name")
              .eq("id", resolvedOtherUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const resolvedListing = (listingRow as ListingRow | null) ?? null;
      const resolvedProfile = (profileRow as ProfileRow | null) ?? null;

      setListing(resolvedListing);
      setOtherUserName(
        resolvedProfile?.public_display_name || toPublicName(resolvedProfile?.full_name)
      );

      await markAsRead(resolvedThread.id, uid);
      await loadReadStatus(resolvedThread.id, uid);
      await loadReviewState(resolvedListing, uid, resolvedOtherUserId ?? null);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  useEffect(() => {
    load();
  }, [threadId]);

  useEffect(() => {
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_thread_members",
          filter: `thread_id=eq.${threadId}`,
        },
        async () => {
          if (userId) {
            await loadReadStatus(threadId, userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, userId]);

  const groupedInfo = useMemo(() => {
    const total = messages.length;
    const systemCount = messages.filter(
      (item) => item.message.startsWith("✅") || item.message.startsWith("🔐")
    ).length;
    return { total, systemCount };
  }, [messages]);

  const lastOwnMessage = useMemo(() => {
    return [...messages].reverse().find((item) => item.sender_id === userId);
  }, [messages, userId]);

  function isLastMessageSeen(message: ChatMessageRow) {
    if (!otherUserLastReadAt || !lastOwnMessage) return false;
    if (message.id !== lastOwnMessage.id) return false;
    return new Date(otherUserLastReadAt).getTime() >= new Date(message.created_at).getTime();
  }

  const reviewButtonState = useMemo(() => {
    if (!thread?.listing_id) {
      return {
        disabled: true,
        label: "Értékelés nem elérhető",
        hint: "Ehhez a beszélgetéshez nem tartozik értékelhető tranzakció.",
      };
    }

    if (alreadyReviewed) {
      return {
        disabled: true,
        label: "Már értékelted",
        hint: "Ehhez a tranzakcióhoz már leadtad az értékelést.",
      };
    }

    if (!canReview) {
      return {
        disabled: true,
        label: "Értékelés később",
        hint: "Az értékelés csak lezárt, értékelhető tranzakció után érhető el.",
      };
    }

    return {
      disabled: false,
      label: "Másik fél értékelése",
      hint: `${otherUserName} értékelése ehhez a tranzakcióhoz.`,
    };
  }, [thread?.listing_id, alreadyReviewed, canReview, otherUserName]);

  const canSend = useMemo(() => !!text.trim() && !!userId && !!thread, [text, userId, thread]);

  async function handleSend() {
    if (!canSend || !userId || !threadId || sending) return;

    setSending(true);
    const clean = text.trim();

    try {
      const { error } = await supabase.from("chat_messages").insert({
        thread_id: threadId,
        sender_id: userId,
        message: clean,
      });

      if (error) {
        window.alert(error.message || "Nem sikerült elküldeni az üzenetet.");
        return;
      }

      setText("");
      await markAsRead(threadId, userId);
      await load();
    } finally {
      setSending(false);
    }
  }

  async function openReviewModal() {
    if (reviewButtonState.disabled) {
      window.alert(reviewButtonState.hint);
      return;
    }

    setReviewLoading(true);
    try {
      await load();
      setReviewModalOpen(true);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleSubmitReview() {
    if (!userId || !listing?.id || !otherUserId) {
      window.alert("Nem sikerült az értékeléshez szükséges adatokat betölteni.");
      return;
    }

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      window.alert("Adj meg 1 és 5 közötti értékelést.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const { error } = await supabase.from("listing_reviews").insert({
        listing_id: listing.id,
        reviewer_user_id: userId,
        reviewed_user_id: otherUserId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (error) {
        window.alert(error.message || "Nem sikerült elküldeni az értékelést.");
        return;
      }

      setReviewModalOpen(false);
      setReviewRating(0);
      setReviewComment("");
      await load();
      window.alert("Az értékelés sikeresen elküldve.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (!userId && !loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <MessageCircle className="h-7 w-7 text-slate-600" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              Jelentkezz be a chathez
            </h1>
            <div className="mt-6">
              <Button asChild className="rounded-full px-6">
                <Link href="/login">Belépés</Link>
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
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-4 w-4" />
              Privát tranzakciós beszélgetés
            </div>

            <h1 className="mt-4 line-clamp-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {otherUserName || "Másik fél"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {listing?.title || "Tranzakciós chat"}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <MessageCircle className="h-4 w-4" />
                {groupedInfo.total} üzenet
              </span>

              {thread?.created_at ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                  <Clock3 className="h-4 w-4" />
                  {formatDate(thread.created_at)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/chat">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Vissza
              </Link>
            </Button>

            {listing?.id ? (
              <Button className="rounded-full" asChild>
                <Link href={`/listing/${listing.id}`}>Hirdetés megnyitása</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <CardContent className="p-4 sm:p-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Sikeres tranzakció utáni chat
            </div>

            <h2 className="mt-4 text-xl font-black tracking-tight text-slate-900">
              Privát egyeztetés
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Itt tudjátok megbeszélni az átvételt, szállítást és minden további részletet.
              A kapcsolatfelvételi adatok automatikusan megjelennek a beszélgetés elején.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                <MessageCircle className="h-4 w-4" />
                {groupedInfo.total} üzenet
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                <Lock className="h-4 w-4" />
                Privát tranzakciós csatorna
              </span>
            </div>

            <div className="mt-5">
              <Button
                type="button"
                onClick={openReviewModal}
                disabled={reviewButtonState.disabled || reviewLoading}
                className="rounded-2xl"
                variant={reviewButtonState.disabled ? "secondary" : "default"}
              >
                {reviewLoading ? "Betöltés..." : reviewButtonState.label}
              </Button>
              <p className="mt-2 text-xs text-slate-500">{reviewButtonState.hint}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <CardContent className="p-0">
          <div className="max-h-[65vh] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.04),transparent_30%),white] px-4 py-5 sm:px-6">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Üzenetek betöltése...</div>
            ) : messages.length === 0 ? (
              <div className="rounded-[1.5rem] border bg-slate-50 p-8 text-center text-sm text-slate-500">
                Még nincs üzenet.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const mine = msg.sender_id === userId;
                  const isContactBlock = msg.message.startsWith("🔐 Kapcsolattartási adatok");
                  const isSystemLike = msg.message.startsWith("✅ Sikeres tranzakció:");
                  const isSystem = isContactBlock || isSystemLike;

                  return (
                    <div
                      key={msg.id}
                      className={[
                        "flex w-full",
                        isSystem ? "justify-stretch" : mine ? "justify-end" : "justify-start",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "rounded-[1.4rem] px-4 py-3 text-sm leading-6",
                          isContactBlock
                            ? "w-full border border-indigo-200 bg-indigo-50 text-slate-700"
                            : isSystemLike
                            ? "w-full border border-emerald-200 bg-emerald-50 text-slate-700"
                            : mine
                            ? "max-w-[85%] bg-slate-900 text-white"
                            : "max-w-[85%] border border-slate-200 bg-white text-slate-800",
                        ].join(" ")}
                      >
                        {isSystemLike ? (
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            Tranzakció összegzés
                          </div>
                        ) : null}

                        {isContactBlock ? (
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                            <Lock className="h-4 w-4" />
                            Kapcsolattartási adatok
                          </div>
                        ) : null}

                        <div className="whitespace-pre-line">{msg.message}</div>

                        <div
                          className={[
                            "mt-2 text-[11px]",
                            mine && !isSystem ? "text-slate-300" : "text-slate-500",
                          ].join(" ")}
                        >
                          {formatDate(msg.created_at)}
                        </div>

                        {mine && msg.id === lastOwnMessage?.id ? (
                          <div className={`mt-1 text-[11px] font-medium ${isLastMessageSeen(msg) ? "text-emerald-300" : "text-slate-300"}`}>
                            {isLastMessageSeen(msg) ? "Látta" : "Elküldve"}
                          </div>
                        ) : null}
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

      {reviewModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-black tracking-tight text-slate-900">
                  Másik fél értékelése
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {otherUserName}
                  {listing?.title ? ` · ${listing.title}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => !reviewSubmitting && setReviewModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-900">Értékelés</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= reviewRating;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      className={[
                        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition",
                        active
                          ? "border-amber-300 bg-amber-100 text-amber-600"
                          : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <Star className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Adj rövid, kulturált visszajelzést a tranzakcióról.
              </p>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-900">Megjegyzés</div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Pl. Gyors, korrekt, pontos kommunikáció."
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                disabled={reviewSubmitting}
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => !reviewSubmitting && setReviewModalOpen(false)}
                disabled={reviewSubmitting}
              >
                Mégse
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-2xl"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? "Küldés..." : "Értékelés elküldése"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
