"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadSession() {
    const { data } = await supabase.auth.getSession();
    setSessionUserId(data.session?.user?.id ?? null);
  }

  async function loadMessages() {
    if (!threadId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("id,thread_id,sender_id,content,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as ChatMessage[]);
    setLoading(false);
  }

  async function handleSend() {
    if (!threadId || !sessionUserId || !text.trim() || sending) return;

    setSending(true);

    const content = text.trim();

    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: sessionUserId,
      content,
    });

    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setText("");
  }

  useEffect(() => {
    loadSession();
    loadMessages();
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;

          setItems((prev) => {
            const exists = prev.some((x) => x.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <CardHeader className="border-b border-slate-200/80">
          <CardTitle className="text-xl">Beszélgetés</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-[65vh] overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4 sm:p-6">
            {loading ? (
              <div className="text-sm text-slate-500">Betöltés...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                Még nincs üzenet ebben a beszélgetésben.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const mine = item.sender_id === sessionUserId;

                  return (
                    <div
                      key={item.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                          mine
                            ? "rounded-tr-md bg-indigo-600 text-white"
                            : "rounded-tl-md border border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        <div className="whitespace-pre-line text-sm leading-6">
                          {item.content}
                        </div>
                        <div
                          className={`mt-2 text-[11px] ${
                            mine ? "text-white/70" : "text-slate-500"
                          }`}
                        >
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/80 bg-white p-3 sm:p-4">
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
    </div>
  );
}