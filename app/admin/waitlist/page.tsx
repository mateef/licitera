import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type WaitlistRow = {
  id: string;
  email: string;
  created_at: string;
};

export default async function AdminWaitlistPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("waitlist")
    .select("id,email,created_at")
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as WaitlistRow[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Várólista</h1>
        <p className="text-sm text-muted-foreground">
          Itt látod az indulásról értesítést kérő felhasználókat.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="rounded-full border px-3 py-1 text-sm">
          Összes feliratkozó: <span className="font-semibold">{rows.length}</span>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Hiba történt</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error.message}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Még nincs feliratkozó</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Amint valaki kitölti a landing oldalon az email mezőt, itt meg fog jelenni.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Feliratkozók listája</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Feliratkozás ideje</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{row.email}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("hu-HU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}