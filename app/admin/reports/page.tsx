"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ReportRow = {
  id: string;
  listing_id: string;
  reporter_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  image_urls: string[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [listingsMap, setListingsMap] = useState<Record<string, ListingRow>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email ?? "";
    const admin = email === "fmate2000@gmail.com";
    setIsAdmin(admin);

    if (!admin) {
      setLoading(false);
      return;
    }

    const { data: reportData, error: reportError } = await supabase
      .from("listing_reports")
      .select("id,listing_id,reporter_user_id,reason,details,status,admin_note,created_at,reviewed_at")
      .order("created_at", { ascending: false });

    if (reportError) {
      toast.error(reportError.message);
      setLoading(false);
      return;
    }

    const reportRows = (reportData ?? []) as ReportRow[];
    setReports(reportRows);

    const listingIds = Array.from(new Set(reportRows.map((r) => r.listing_id)));
    const userIds = Array.from(new Set(reportRows.map((r) => r.reporter_user_id)));

    if (listingIds.length > 0) {
      const { data: listingData } = await supabase
        .from("listings")
        .select("id,title,image_urls")
        .in("id", listingIds);

      const nextListingsMap: Record<string, ListingRow> = {};
      (listingData ?? []).forEach((item: any) => {
        nextListingsMap[item.id] = item;
      });
      setListingsMap(nextListingsMap);
    } else {
      setListingsMap({});
    }

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds);

      const nextProfilesMap: Record<string, ProfileRow> = {};
      (profileData ?? []).forEach((item: any) => {
        nextProfilesMap[item.id] = item;
      });
      setProfilesMap(nextProfilesMap);
    } else {
      setProfilesMap({});
    }

    setLoading(false);
  }

  async function closeReport(reportId: string, nextStatus: "approved" | "rejected") {
    setWorkingId(reportId);

    try {
      const { error } = await supabase
        .from("listing_reports")
        .update({
          status: nextStatus,
          admin_note: adminNotes[reportId] ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(nextStatus === "approved" ? "Report jóváhagyva." : "Report elutasítva.");
      await loadAll();
    } finally {
      setWorkingId(null);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (!loading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nincs hozzáférés</CardTitle>
          <CardDescription>Ez az oldal csak admin számára érhető el.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportok</h1>
        <p className="text-sm text-muted-foreground">
          Itt láthatod a felhasználók által jelentett hirdetéseket.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Betöltés...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nincs report</CardTitle>
            <CardDescription>Jelenleg nincs feldolgozandó jelentés.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const listing = listingsMap[report.listing_id];
            const profile = profilesMap[report.reporter_user_id];
            const noteValue = adminNotes[report.id] ?? report.admin_note ?? "";
            const isPending = report.status === "pending";

            return (
              <Card key={report.id} className="overflow-hidden">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
                  <div>
                    {listing?.image_urls?.[0] ? (
                      <img
                        src={listing.image_urls[0]}
                        alt={listing?.title ?? "Hirdetés"}
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                        Nincs kép
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {listing?.title ?? "Törölt / nem elérhető hirdetés"}
                      </h2>

                      {report.status === "pending" ? (
                        <Badge>Függőben</Badge>
                      ) : report.status === "approved" ? (
                        <Badge variant="destructive">Jogos</Badge>
                      ) : (
                        <Badge variant="secondary">Elutasítva</Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div>Jelentő: {profile?.full_name || "Ismeretlen felhasználó"}</div>
                      <div>Email: {profile?.email || "-"}</div>
                      <div>Időpont: {new Date(report.created_at).toLocaleString()}</div>
                    </div>

                    <div className="rounded-xl border p-3 text-sm">
                      <div className="mb-1 font-medium">Ok</div>
                      <div className="text-muted-foreground">{report.reason}</div>
                    </div>

                    {report.details ? (
                      <div className="rounded-xl border p-3 text-sm">
                        <div className="mb-1 font-medium">Megjegyzés</div>
                        <div className="text-muted-foreground">{report.details}</div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Admin megjegyzés</div>
                      <Textarea
                        value={noteValue}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [report.id]: e.target.value,
                          }))
                        }
                        placeholder="Belső admin megjegyzés..."
                        className="min-h-[100px]"
                        disabled={!isPending}
                      />
                    </div>

                    {isPending ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => closeReport(report.id, "approved")}
                          disabled={workingId === report.id}
                        >
                          {workingId === report.id ? "Feldolgozás..." : "Jogos report"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => closeReport(report.id, "rejected")}
                          disabled={workingId === report.id}
                        >
                          Elutasítás
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Feldolgozva{report.reviewed_at ? `: ${new Date(report.reviewed_at).toLocaleString()}` : "."}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}