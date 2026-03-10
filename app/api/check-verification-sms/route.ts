import { NextResponse } from "next/server";
import twilio from "twilio";
import { normalizeHungarianPhone } from "@/lib/phone";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { phone, code, userId } = await req.json();

    const normalizedPhone = normalizeHungarianPhone(String(phone ?? ""));
    const smsCode = String(code ?? "").trim();

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Érvényes telefonszám szükséges." },
        { status: 400 }
      );
    }

    if (!smsCode) {
      return NextResponse.json(
        { error: "Add meg az SMS kódot." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Hiányzó felhasználó azonosító." },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!accountSid || !authToken || !verifyServiceSid || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Hiányzik a szerver oldali beállítás." },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: normalizedPhone,
        code: smsCode,
      });

    if (check.status !== "approved") {
      return NextResponse.json(
        { error: "A megadott kód érvénytelen vagy lejárt." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("profiles")
      .update({ phone_verified: true })
      .eq("id", userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Nem sikerült ellenőrizni az SMS kódot." },
      { status: 500 }
    );
  }
}