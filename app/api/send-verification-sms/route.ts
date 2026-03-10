import { NextResponse } from "next/server";
import twilio from "twilio";
import { normalizeHungarianPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    const normalizedPhone = normalizeHungarianPhone(String(phone ?? ""));

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Érvényes magyar telefonszámot adj meg." },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      return NextResponse.json(
        { error: "Hiányzik a Twilio szerver oldali beállítás." },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: normalizedPhone,
        channel: "sms",
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Nem sikerült elküldeni az SMS kódot." },
      { status: 500 }
    );
  }
}