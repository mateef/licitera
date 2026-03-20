"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id ?? null;
    setUid(userId);

    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,message,link,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setItems((data ?? []) as NotificationRow[]);
    }

    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );

      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }
  }

  async function markAllAsRead() {
    if (!uid) return;

    const unreadIds = items.filter((x) => !x.is_read).map((x) => x.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`notifications-page-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  const unreadCount = useMemo(
    () => items.filter((x) => !x.is_read).length,
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Értesítések</h1>
          <p className="text-sm text-muted-foreground">
            Itt találod a legutóbbi oldalon belüli értesítéseidet.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadNotifications}>
            Frissítés
          </Button>
          <Button onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mind olvasott
          </Button>
        </div>
      </div>

      {!uid && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Nem vagy bejelentkezve</CardTitle>
            <CardDescription>Jelentkezz be az értesítések megtekintéséhez.</CardDescription>
          </CardHeader>
        </Card>
      ) : loading ? (
        <div className="text-sm text-muted-foreground">Betöltés...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nincs értesítés</CardTitle>
            <CardDescription>Még nincs megjeleníthető értesítésed.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.link || "/notifications"}
              onClick={() => {
                if (!item.is_read) {
                  markAsRead(item.id);
                }
              }}
              className={`block rounded-[1.25rem] border p-4 transition hover:shadow-sm ${
                item.is_read
                  ? "border-slate-200 bg-white"
                  : "border-blue-200 bg-blue-50/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  {!item.is_read ? (
                    <span className="block h-2.5 w-2.5 rounded-full bg-blue-500" />
                  ) : (
                    <span className="block h-2.5 w-2.5 rounded-full bg-slate-200" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.message}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}