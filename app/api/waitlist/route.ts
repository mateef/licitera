import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Adj meg egy email címet." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Hiányzik a Supabase szerver oldali beállítás." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: normalizedEmail });

    if (error) {
  if (error.message.includes("duplicate key")) {
    return NextResponse.json({
      success: true,
      message: "Ez az email már fel van iratkozva."
    });
  }

  return NextResponse.json(
    { error: "Hiba történt a feliratkozásnál." },
    { status: 400 }
  );
}

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Váratlan szerverhiba történt." },
      { status: 500 }
    );
  }
}