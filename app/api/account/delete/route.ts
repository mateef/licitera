import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Hiányzik a szerver oldali Supabase konfiguráció.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json({ error: "Hiányzó azonosítás." }, { status: 401 });
    }

    const userClient = getUserClient(token);
    const adminClient = getAdminClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ error: "Érvénytelen munkamenet." }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email ?? null;

    // Kötelezőbb törlések / módosítások

    const { error: watchlistError } = await adminClient
      .from("watchlist")
      .delete()
      .eq("user_id", userId);

    if (watchlistError) {
      return NextResponse.json(
        { error: watchlistError.message || "Nem sikerült törölni a figyelőlistát." },
        { status: 500 }
      );
    }

    // Opcionális táblák / best-effort cleanup

    try {
      await adminClient
        .from("listing_reports")
        .delete()
        .eq("reporter_user_id", userId);
    } catch {}

    try {
      await adminClient
        .from("user_reports")
        .delete()
        .eq("reporter_user_id", userId);
    } catch {}

    try {
      await adminClient
        .from("chat_messages")
        .delete()
        .eq("sender_id", userId);
    } catch {}

    try {
      await adminClient
        .from("chat_threads")
        .delete()
        .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`);
    } catch {}

    try {
      await adminClient
        .from("listings")
        .update({
          is_active: false,
          title: "Törölt felhasználó hirdetése",
          description: null,
        })
        .eq("user_id", userId);
    } catch {}

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        full_name: "Törölt felhasználó",
        email: null,
        phone: null,
        avatar_url: null,
        bio: null,
        phone_verified: false,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      return NextResponse.json(
        { error: profileUpdateError.message || "Nem sikerült anonimizálni a profilt." },
        { status: 500 }
      );
    }

    try {
      await adminClient
        .from("billing_user_balances")
        .update({
          balance_amount: 0,
        })
        .eq("user_id", userId);
    } catch {}

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message || "Nem sikerült törölni a fiókot." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "A fiók törlése sikeres volt.",
      email: userEmail,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Ismeretlen szerverhiba történt." },
      { status: 500 }
    );
  }
}