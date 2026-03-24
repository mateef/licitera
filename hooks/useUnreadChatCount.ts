"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUnreadChatCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("chat_thread_members")
      .select("thread_id,last_read_at")
      .eq("user_id", userId);

    if (membershipsError || !memberships) {
      setUnreadCount(0);
      return;
    }

    const counts = await Promise.all(
      memberships.map(async (row: any) => {
        const { count, error } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", row.thread_id)
          .neq("sender_id", userId)
          .gt("created_at", row.last_read_at || "1970-01-01T00:00:00.000Z");

        if (error) return 0;
        return count ?? 0;
      })
    );

    setUnreadCount(counts.reduce((sum, value) => sum + value, 0));
  }

  useEffect(() => {
    load();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    const channel = supabase
      .channel("web-unread-chat-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async () => {
          await load();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_thread_members" },
        async () => {
          await load();
        }
      )
      .subscribe();

    const interval = setInterval(load, 10000);

    return () => {
      clearInterval(interval);
      authSub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(
    () => ({
      unreadCount,
      unreadLabel: unreadCount > 9 ? "9+" : String(unreadCount),
      hasUnread: unreadCount > 0,
    }),
    [unreadCount]
  );
}