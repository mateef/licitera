"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  async function loadNotifications() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id ?? null;
    setUid(userId);

    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("id,title,message,link,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);

    const list = (data ?? []) as NotificationRow[];

    setItems(list);
    setUnreadCount(list.filter((x) => !x.is_read).length);
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
      setUnreadCount((prev) => Math.max(0, prev - 1));

      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }
  }

  useEffect(() => {
    loadNotifications();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadNotifications();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`notifications-${uid}`)
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

  useEffect(() => {
    function handleNotificationsUpdated() {
      loadNotifications();
    }

    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
    };
  }, []);

  if (!uid) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 active:scale-[0.96]">
          <Bell className="h-5 w-5 text-slate-700" />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] rounded-2xl border border-slate-200 bg-white p-0 shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">
            Értesítések
          </span>

          {unreadCount > 0 && (
            <span className="text-xs text-slate-500">
              {unreadCount} új
            </span>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              Nincs új értesítésed
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={async () => {
                  if (!item.is_read) {
                    await markAsRead(item.id);
                  }

                  router.push(item.link || "/notifications");
                }}
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left transition",
                  "hover:bg-slate-50 active:bg-slate-100",
                  !item.is_read && "bg-blue-50/40"
                )}
              >
                <div className="pt-1">
                  <span
                    className={cn(
                      "block h-2.5 w-2.5 rounded-full",
                      item.is_read ? "bg-slate-300" : "bg-blue-500"
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {item.title}
                    </div>

                    {!item.is_read && (
                      <span className="text-[10px] font-bold text-blue-600">
                        ÚJ
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {item.message}
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t p-2">
          <button
            onClick={() => router.push("/notifications")}
            className="w-full rounded-xl py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Összes értesítés megtekintése
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}