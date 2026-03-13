"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

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

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,message,link,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error) {
      setItems((data ?? []) as NotificationRow[]);
      setUnreadCount((data ?? []).filter((x: any) => !x.is_read).length);
    }
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
        { event: "*", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  if (!uid) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative h-11 rounded-full px-3">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel>Értesítések</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            Nincs új értesítésed.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="cursor-pointer items-start py-3"
              onClick={async () => {
                if (!item.is_read) {
                  await markAsRead(item.id);
                }

                if (item.link) {
                  router.push(item.link);
                } else {
                  router.push("/notifications");
                }
              }}
            >
              <div className="flex w-full gap-3">
                <div className="pt-1">
                  {!item.is_read ? (
                    <span className="block h-2.5 w-2.5 rounded-full bg-blue-500" />
                  ) : (
                    <span className="block h-2.5 w-2.5 rounded-full bg-slate-200" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{item.title}</div>
                    {!item.is_read ? <Badge variant="secondary">Új</Badge> : null}
                  </div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {item.message}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer justify-center font-medium"
          onClick={() => router.push("/notifications")}
        >
          Továbbiak
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}