import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Hiányzó auth header." }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Érvénytelen felhasználó." }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier,subscription_status,subscription_current_period_end")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      subscriptionTier: (profile as any)?.subscription_tier ?? "free",
      subscriptionStatus: (profile as any)?.subscription_status ?? "active",
      currentPeriodEnd: (profile as any)?.subscription_current_period_end ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Nem sikerült lekérni az előfizetés állapotát." },
      { status: 500 }
    );
  }
}