import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserFromBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getUserFromBearerToken(req);

    if (!adminUser || adminUser.email !== "fmate2000@gmail.com") {
      return NextResponse.json({ error: "Nincs jogosultság." }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = String(body?.userId ?? "").trim();
    const targetBalance = Number(body?.targetBalance);
    const note = String(body?.note ?? "").trim();

    if (!targetUserId) {
      return NextResponse.json({ error: "Hiányzik a userId." }, { status: 400 });
    }

    if (!Number.isFinite(targetBalance) || targetBalance > 0) {
      return NextResponse.json(
        { error: "A cél egyenleg csak 0 vagy negatív szám lehet." },
        { status: 400 }
      );
    }

    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name")
      .eq("id", targetUserId)
      .maybeSingle();

    if (userProfileError) {
      return NextResponse.json({ error: userProfileError.message }, { status: 500 });
    }

    if (!userProfile) {
      return NextResponse.json({ error: "A megadott felhasználó nem található." }, { status: 404 });
    }

    const { data: balanceRow, error: balanceError } = await supabaseAdmin
      .from("billing_user_balances")
      .select("balance_amount")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (balanceError) {
      return NextResponse.json({ error: balanceError.message }, { status: 500 });
    }

    const currentBalance = Number((balanceRow as any)?.balance_amount ?? 0);

    if (!Number.isFinite(currentBalance)) {
      return NextResponse.json(
        { error: "Érvénytelen jelenlegi egyenleg." },
        { status: 500 }
      );
    }

    const adjustmentAmount = targetBalance - currentBalance;

    if (adjustmentAmount === 0) {
      return NextResponse.json({
        success: true,
        message: "A felhasználó egyenlege már ezen az értéken van.",
        currentBalance,
        targetBalance,
        adjustmentAmount: 0,
      });
    }

    const description = note
      ? `Admin teszt egyenleg korrekció: ${note}`
      : `Admin teszt egyenleg korrekció → ${targetBalance} Ft`;

    const { error: ledgerError } = await supabaseAdmin.from("billing_ledger").insert({
      user_id: targetUserId,
      entry_type: "admin_balance_adjustment",
      amount: adjustmentAmount,
      description,
    });

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Teszt egyenleg sikeresen beállítva.",
      currentBalance,
      targetBalance,
      adjustmentAmount,
      user: {
        id: (userProfile as any).id,
        email: (userProfile as any).email,
        full_name: (userProfile as any).full_name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ismeretlen hiba történt." },
      { status: 500 }
    );
  }
}