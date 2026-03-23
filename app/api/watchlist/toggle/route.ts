import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Bejelentkezés szükséges." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const listingId = String(body?.listingId || "");

    if (!listingId) {
      return NextResponse.json({ error: "Hiányzó listingId." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existing?.id) {
      const { error: deleteError } = await supabase
        .from("watchlist")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        saved: false,
      });
    }

    const { error: insertError } = await supabase.from("watchlist").insert({
      user_id: user.id,
      listing_id: listingId,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      saved: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Watchlist toggle hiba." },
      { status: 500 }
    );
  }
}