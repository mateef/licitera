import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body?.username ?? "");
    const password = String(body?.password ?? "");

    const admin1User = process.env.PRELAUNCH_USER_1 ?? "Admin1";
    const admin1Pass = process.env.PRELAUNCH_PASS_1 ?? "Admin1!";
    const admin2User = process.env.PRELAUNCH_USER_2 ?? "Admin2";
    const admin2Pass = process.env.PRELAUNCH_PASS_2 ?? "Admin2!";

    const isValid =
      (username === admin1User && password === admin1Pass) ||
      (username === admin2User && password === admin2Pass);

    if (!isValid) {
      return NextResponse.json(
        { error: "Hibás felhasználónév vagy jelszó." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set("licitera_prelaunch_auth", "ok", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Érvénytelen kérés." },
      { status: 400 }
    );
  }
}