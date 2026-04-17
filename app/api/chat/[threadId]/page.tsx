"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock3,
  Lock,
  MessageCircle,
  Send,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";

type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type ThreadRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  closed_at: string | null;
  winner_user_id: string | null;
  user_id: string | null;
};

const USER_REPORT_REASONS = [
  "Csalás gyanúja",
  "Hamis vagy megtévesztő profil",
  "Zaklató vagy sértő viselkedés",
  "Tiltott termékek / szabályszegés",
  "Spam vagy visszaélés",
  "Egyéb",
];

function formatMessageTime(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toPublicName(fullName: string | null | undefined) {
  if (!fullName) return "Ismeretlen felhasználó";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ismeretlen felhasználó";
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

export default function ChatThreadPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = params.threadId;

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [otherUserName, setOtherUserName] = useState("Másik fél");
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [reviewedUserId, setReviewedUserId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadSession() {
    const { data } = await supabase.auth.getSession();
    setSessionUserId(data.session?.user?.id ?? null);
  }

  async function markThreadAsRead(threadId: string, userId: string) {
    const nowIso = new Date().toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("chat_thread_members")
      .select("thread_id,user_id")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const { error } = await supabase
        .from("chat_thread_members")
        .update({ last_read_at: nowIso })
        .eq("thread_id", threadId)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase.from("chat_thread_members").insert({
      thread_id: threadId,
      user_id: userId,
      last_read_at: nowIso,
    });

    if (error) throw new Error(error.message);
  }

  async function loadReadStatus() {
    if (!threadId || !sessionUserId) return;

    const { data, error } = await supabase
      .from("chat_thread_members")
      .select("user_id,last_read_at")
      .eq("thread_id", threadId);

    if (error) {
      toast.error(error.message);
      return;
    }

    const other = (data ?? []).find((row: any) => row.user_id !== sessionUserId);
    setOtherUserLastReadAt(other?.last_read_at ?? null);
  }

  async function loadMessages() {
    if (!threadId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,thread_id,sender_id,message,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as ChatMessage[]);

    if (sessionUserId) {
      try {
        await markThreadAsRead(threadId, sessionUserId);
      } catch (e: any) {
        toast.error(e?.message || "Nem sikerült olvasottnak jelölni.");
      }
    }

    await loadReadStatus();
    setLoading(false);
  }

  async function loadThreadMeta() {
    if (!threadId || !sessionUserId) return;

    const { data: threadData, error: threadError } = await supabase
      .from("chat_threads")
      .select("id,listing_id,buyer_id,seller_id")
      .eq("id", threadId)
      .maybeSingle();

    if (threadError) {
      toast.error(threadError.message);
      return;
    }

    const threadRow = (threadData ?? null) as ThreadRow | null;
    setThread(threadRow);

    if (!threadRow) {
      setListing(null);
      setReviewedUserId(null);
      setCanReview(false);
      setAlreadyReviewed(false);
      return;
    }

    const otherUserId =
      threadRow.buyer_id === sessionUserId ? threadRow.seller_id : threadRow.buyer_id;

    setReviewedUserId(otherUserId ?? null);

    if (otherUserId) {
      const { data: otherProfile, error: otherProfileError } = await supabase
        .from("profiles")
        .select("full_name,public_display_name")
        .eq("id", otherUserId)
        .maybeSingle();

      if (otherProfileError) {
        toast.error(otherProfileError.message);
      }

      const displayName =
        (otherProfile as any)?.public_display_name ||
        toPublicName((otherProfile as any)?.full_name);

      setOtherUserName(displayName || "Másik fél");
    } else {
      setOtherUserName("Másik fél");
    }

    if (!threadRow.listing_id) {
      setListing(null);
      setCanReview(false);
      setAlreadyReviewed(false);
      return;
    }

    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select("id,title,closed_at,winner_user_id,user_id")
      .eq("id", threadRow.listing_id)
      .maybeSingle();

    if (listingError) {
      toast.error(listingError.message);
      return;
    }

    const listingRow = (listingData ?? null) as ListingRow | null;
    setListing(listingRow);

    if (!listingRow || !otherUserId) {
      setCanReview(false);
      setAlreadyReviewed(false);
      return;
    }

    const { data: canReviewData, error: canReviewError } = await supabase.rpc(
      "can_review_listing",
      {
        p_listing_id: listingRow.id,
        p_reviewed_user_id: otherUserId,
      }
    );

    if (canReviewError) {
      toast.error(canReviewError.message);
      setCanReview(false);
    } else {
      setCanReview(!!canReviewData);
    }

    const { data: existingReview, error: reviewError } = await supabase
      .from("listing_reviews")
      .select("id")
      .eq("listing_id", listingRow.id)
      .eq("reviewer_user_id", sessionUserId)
      .eq("reviewed_user_id", otherUserId)
      .maybeSingle();

    if (reviewError) {
      toast.error(reviewError.message);
      setAlreadyReviewed(false);
    } else {
      setAlreadyReviewed(!!existingReview);
    }
  }

  async function handleSend() {
    if (!threadId || !sessionUserId || !text.trim() || sending) return;

    try {
      setSending(true);

      const clean = text.trim();

      const { data: threadData, error: threadError } = await supabase
        .from("chat_threads")
        .select("id,listing_id,seller_id,buyer_id")
        .eq("id", threadId)
        .maybeSingle();

      if (threadError) {
        toast.error(threadError.message);
        return;
      }

      if (!threadData) {
        toast.error("A beszélgetés nem található.");
        return;
      }

      if (
        threadData.seller_id !== sessionUserId &&
        threadData.buyer_id !== sessionUserId
      ) {
        toast.error("Ehhez a beszélgetéshez nincs hozzáférésed.");
        return;
      }

      const { error } = await supabase.from("chat_messages").insert({
        thread_id: threadId,
        sender_id: sessionUserId,
        message: clean,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      await markThreadAsRead(threadId, sessionUserId);
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function openReviewModal() {
    if (reviewButtonState.disabled) {
      toast.info(reviewButtonState.hint);
      return;
    }

    setReviewLoading(true);
    try {
      await loadThreadMeta();
      setReviewModalOpen(true);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleSubmitReview() {
    if (!sessionUserId || !listing?.id || !reviewedUserId) {
      toast.error("Nem sikerült az értékeléshez szükséges adatokat betölteni.");
      return;
    }

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      toast.error("Adj meg 1 és 5 közötti értékelést.");
      return;
    }

    try {
      setReviewSubmitting(true);

      const { error } = await supabase.from("listing_reviews").insert({
        listing_id: listing.id,
        reviewer_user_id: sessionUserId,
        reviewed_user_id: reviewedUserId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (error) {
        toast.error(error.message || "Nem sikerült elküldeni az értékelést.");
        return;
      }

      toast.success("Az értékelés sikeresen elküldve.");
      setReviewModalOpen(false);
      setReviewRating(0);
      setReviewComment("");
      await loadThreadMeta();
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleSubmitUserReport() {
    if (!sessionUserId) {
      toast.error("Jelentés küldéséhez be kell jelentkezni.");
      return;
    }

    if (!reviewedUserId) {
      toast.error("Hiányzó felhasználó azonosító.");
      return;
    }

    if (reviewedUserId === sessionUserId) {
      toast.error("Saját magadat nem jelentheted.");
      return;
    }

    if (!selectedReportReason) {
      toast.error("Válassz egy jelentési okot.");
      return;
    }

    try {
      setReportSubmitting(true);

      const { error } = await supabase.from("user_reports").insert({
        reporter_user_id: sessionUserId,
        reported_user_id: reviewedUserId,
        reason: selectedReportReason,
        details: reportDetails.trim() || null,
        status: "pending",
      });

      if (error) {
        toast.error(error.message || "Nem sikerült elküldeni a jelentést.");
        return;
      }

      toast.success("A jelentésedet elküldtük felülvizsgálatra.");
      setSelectedReportReason("");
      setReportDetails("");
      setReportModalOpen(false);
    } finally {
      setReportSubmitting(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (!threadId || !sessionUserId) return;
    loadMessages();
    loadThreadMeta();
  }, [threadId, sessionUserId]);

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async () => {
          await loadMessages();
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
          await loadReadStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, sessionUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  const groupedInfo = useMemo(() => {
    const total = items.length;
    const systemCount = items.filter(
      (item) => item.message.startsWith("✅") || item.message.startsWith("🔐")
    ).length;

    return { total, systemCount };
  }, [items]);

  const lastOwnMessage = useMemo(() => {
    return [...items].reverse().find((item) => item.sender_id === sessionUserId);
  }, [items, sessionUserId]);

  function isLastMessageSeen(message: ChatMessage) {
    if (!otherUserLastReadAt) return false;
    if (!lastOwnMessage) return false;
    if (message.id !== lastOwnMessage.id) return false;

    return (
      new Date(otherUserLastReadAt).getTime() >=
      new Date(message.created_at).getTime()
    );
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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="border-b border-slate-200/80 bg-white/90 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-slate-900">{otherUserName}</div>
              <div className="mt-1 text-sm text-slate-500">
                {listing?.title ? listing.title : "Tranzakciós chat"}
              </div>
            </div>

            <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
              Vissza
            </Button>
          </div>
        </CardContent>

        <CardContent className="space-y-4 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4 sm:p-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-600">
              <ShieldCheck className="h-4 w-4" />
              Sikeres tranzakció utáni chat
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
              Privát egyeztetés
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Itt tudjátok megbeszélni az átvételt, szállítást és minden további
              részletet. A kapcsolatfelvételi adatok automatikusan megjelennek a
              beszélgetés elején.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                <MessageCircle className="h-4 w-4 text-indigo-600" />
                {groupedInfo.total} üzenet
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                <Lock className="h-4 w-4 text-indigo-600" />
                Privát tranzakciós csatorna
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Button
                  className="w-full rounded-2xl"
                  disabled={reviewButtonState.disabled || reviewLoading}
                  onClick={openReviewModal}
                >
                  {reviewLoading ? "Betöltés..." : reviewButtonState.label}
                </Button>

                <p className="text-xs leading-5 text-slate-500">
                  {reviewButtonState.hint}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    if (!sessionUserId) {
                      toast.error("Jelentés küldéséhez be kell jelentkezni.");
                      return;
                    }

                    if (!reviewedUserId || reviewedUserId === sessionUserId) {
                      toast.error("A másik fél jelenleg nem jelenthető.");
                      return;
                    }

                    setReportModalOpen(true);
                  }}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Felhasználó jelentése
                </Button>

                <p className="text-xs leading-5 text-slate-500">
                  Jelentsd a másik felet, ha csalásra, zaklatásra vagy visszaélésre
                  gyanakszol.
                </p>
              </div>
            </div>
          </div>

          <div className="h-[60vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Betöltés...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Még nincs üzenet ebben a beszélgetésben.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const mine = item.sender_id === sessionUserId;
                  const isContactBlock = item.message.startsWith("🔐 Kapcsolattartási adatok");
                  const isSystemLike = item.message.startsWith("✅ Sikeres tranzakció:");

                  return (
                    <div
                      key={item.id}
                      className={
                        isContactBlock || isSystemLike
                          ? "flex justify-stretch"
                          : mine
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      <div
                        className={[
                          "rounded-2xl px-4 py-3 shadow-sm",
                          isContactBlock
                            ? "w-full border border-indigo-200 bg-indigo-50 text-slate-900"
                            : isSystemLike
                            ? "w-full border border-emerald-200 bg-emerald-50 text-slate-900"
                            : mine
                            ? "max-w-[82%] rounded-tr-md bg-indigo-600 text-white"
                            : "max-w-[82%] rounded-tl-md border border-slate-200 bg-white text-slate-900",
                        ].join(" ")}
                      >
                        {isSystemLike ? (
                          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            Tranzakció összegzés
                          </div>
                        ) : null}

                        {isContactBlock ? (
                          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-indigo-700">
                            <Lock className="h-4 w-4" />
                            Kapcsolattartási adatok
                          </div>
                        ) : null}

                        <div className="whitespace-pre-line text-sm leading-6">
                          {item.message}
                        </div>

                        <div
                          className={[
                            "mt-2 flex items-center gap-1 text-[11px]",
                            mine && !isContactBlock && !isSystemLike
                              ? "text-white/70"
                              : "text-slate-500",
                          ].join(" ")}
                        >
                          <Clock3 className="h-3 w-3" />
                          {formatMessageTime(item.created_at)}
                        </div>

                        {mine && item.id === lastOwnMessage?.id ? (
                          <div
                            className={[
                              "mt-1 text-right text-[11px] font-medium",
                              isLastMessageSeen(item)
                                ? "text-emerald-200"
                                : "text-white/70",
                            ].join(" ")}
                          >
                            {isLastMessageSeen(item) ? "Látta" : "Elküldve"}
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

          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-end gap-2">
              <Input
                placeholder="Írj üzenetet..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="h-12 rounded-xl"
                disabled={!sessionUserId || sending}
              />

              <Button
                className="h-12 rounded-xl"
                onClick={handleSend}
                disabled={!sessionUserId || !text.trim() || sending}
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Küldés..." : "Küldés"}
              </Button>
            </div>

            {!sessionUserId ? (
              <div className="mt-2 text-xs text-slate-500">
                Üzenetküldéshez be kell jelentkezni.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {reviewModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">Másik fél értékelése</div>
                <div className="mt-1 text-sm text-slate-500">
                  {otherUserName}
                  {listing?.title ? ` · ${listing.title}` : ""}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={reviewSubmitting}
                onClick={() => setReviewModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 text-sm font-extrabold text-slate-900">Értékelés</div>

            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= reviewRating;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewRating(value)}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      active
                        ? "border-amber-400 bg-amber-50"
                        : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <Star
                      className={`h-5 w-5 ${active ? "text-amber-500" : "text-slate-300"}`}
                      fill={active ? "currentColor" : "transparent"}
                    />
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Adj rövid, kulturált visszajelzést a tranzakcióról.
            </p>

            <div className="mt-5 text-sm font-extrabold text-slate-900">Megjegyzés</div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Pl. Gyors, korrekt, pontos kommunikáció."
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 placeholder:text-slate-400"
              disabled={reviewSubmitting}
            />

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                disabled={reviewSubmitting}
                onClick={() => setReviewModalOpen(false)}
              >
                Mégse
              </Button>

              <Button
                className="flex-1 rounded-2xl"
                disabled={reviewSubmitting}
                onClick={handleSubmitReview}
              >
                {reviewSubmitting ? "Küldés..." : "Értékelés elküldése"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {reportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">Felhasználó jelentése</div>
                <div className="mt-1 text-sm text-slate-500">{otherUserName}</div>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={reportSubmitting}
                onClick={() => setReportModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Válaszd ki a jelentés okát, és írj rövid indoklást, ha szükséges.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {USER_REPORT_REASONS.map((reason) => {
                const active = selectedReportReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReportReason(reason)}
                    className={`rounded-full border px-3 py-2 text-sm font-bold ${
                      active
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 text-sm font-extrabold text-slate-900">Indoklás</div>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Írd le röviden, mi a probléma..."
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 placeholder:text-slate-400"
              disabled={reportSubmitting}
            />

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                disabled={reportSubmitting}
                onClick={() => setReportModalOpen(false)}
              >
                Mégse
              </Button>

              <Button
                className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700"
                disabled={reportSubmitting || !selectedReportReason}
                onClick={handleSubmitUserReport}
              >
                {reportSubmitting ? "Küldés..." : "Jelentés elküldése"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}