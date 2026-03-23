import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
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
      return NextResponse.json({ items: [] });
    }

    const { data: watchRows, error: watchError } = await supabase
      .from("watchlist")
      .select("listing_id")
      .eq("user_id", user.id);

    if (watchError) {
      return NextResponse.json(
        { error: watchError.message },
        { status: 500 }
      );
    }

    const ids = (watchRows ?? []).map((x: any) => x.listing_id as string);

    if (ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select(
        "id,title,current_price,ends_at,image_urls,min_increment,county,city,delivery_mode,buy_now_price,is_active,categories(name)"
      )
      .in("id", ids)
      .eq("is_active", true)
      .order("ends_at", { ascending: true });

    if (listingsError) {
      return NextResponse.json(
        { error: listingsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: listings ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Watchlist list hiba." },
      { status: 500 }
    );
  }
}