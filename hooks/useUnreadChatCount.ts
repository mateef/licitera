"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUnreadChatCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadCount() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;

      if (!userId) {
        setCount(0);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_my_unread_chat_count");

      if (error) {
        setCount(0);
        setLoading(false);
        return;
      }

      setCount(Number(data ?? 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCount();

    const authSub = supabase.auth.onAuthStateChange(() => {
      loadCount();
    });

    const messagesChannel = supabase
      .channel("web-unread-chat-count-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async () => {
          await loadCount();
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel("web-unread-chat-count-members")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_thread_members",
        },
        async () => {
          await loadCount();
        }
      )
      .subscribe();

    return () => {
      authSub.data.subscription.unsubscribe();
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  return {
    unreadCount: count,
    unreadLabel: count > 9 ? "9+" : String(count),
    hasUnread: count > 0,
    loading,
    reloadUnreadCount: loadCount,
  };
}