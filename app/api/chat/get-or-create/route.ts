import { createServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();
    const body = await req.json().catch(() => null);

    const listingId = String(body?.listingId ?? "").trim();
    const sellerId = String(body?.sellerId ?? "").trim();

    if (!listingId || !sellerId) {
      return Response.json(
        { error: "Hiányzik a listingId vagy a sellerId." },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.id === sellerId) {
      return Response.json(
        { error: "Saját magaddal nem nyithatsz chatet." },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (existingError) {
      return Response.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return Response.json({ threadId: existing.id });
    }

    const { data, error } = await supabase
      .from("chat_threads")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
      })
      .select("id")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ threadId: data.id });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Váratlan chat hiba." },
      { status: 500 }
    );
  }
}