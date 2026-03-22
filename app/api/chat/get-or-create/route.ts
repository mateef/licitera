import { createServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();

  const { listingId, sellerId } = body;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // check existing
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (existing) {
    return Response.json({ threadId: existing.id });
  }

  const { data, error } = await supabase
    .from("threads")
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
}