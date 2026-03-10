import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Hiányzik a Supabase szerver oldali beállítás." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("waitlist")
      .select("email, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const rows = data ?? [];

    const header = "email,created_at\n";
    const body = rows
      .map((row) => {
        const email = `"${String(row.email ?? "").replace(/"/g, '""')}"`;
        const createdAt = `"${String(row.created_at ?? "").replace(/"/g, '""')}"`;
        return `${email},${createdAt}`;
      })
      .join("\n");

    const csv = header + body;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="licitera-waitlist.csv"',
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Váratlan szerverhiba történt." },
      { status: 500 }
    );
  }
}