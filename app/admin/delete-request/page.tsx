"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type DeleteRequest = {
  id: string;
  listing_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  image_urls: string[] | null;
  image_paths: string[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function AdminDeleteRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [requests, setRequests] = useState<DeleteRequest[]>([]);
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

    const { data: reqData, error: reqError } = await supabase
      .from("listing_delete_requests")
      .select("id,listing_id,user_id,reason,status,admin_note,created_at,reviewed_at")
      .order("created_at", { ascending: false });

    if (reqError) {
      toast.error(reqError.message);
      setLoading(false);
      return;
    }

    const deleteRequests = (reqData ?? []) as DeleteRequest[];
    setRequests(deleteRequests);

    const listingIds = Array.from(new Set(deleteRequests.map((r) => r.listing_id)));
    const userIds = Array.from(new Set(deleteRequests.map((r) => r.user_id)));

    if (listingIds.length > 0) {
      const { data: listingData } = await supabase
        .from("listings")
        .select("id,title,image_urls,image_paths")
        .in("id", listingIds);

      const map: Record<string, ListingRow> = {};
      (listingData ?? []).forEach((item: any) => {
        map[item.id] = item;
      });
      setListingsMap(map);
    } else {
      setListingsMap({});
    }

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds);

      const map: Record<string, ProfileRow> = {};
      (profileData ?? []).forEach((item: any) => {
        map[item.id] = item;
      });
      setProfilesMap(map);
    } else {
      setProfilesMap({});
    }

    setLoading(false);
  }

  async function approveRequest(req: DeleteRequest) {
    setWorkingId(req.id);

    try {
      const listing = listingsMap[req.listing_id];

      if (listing?.image_paths && listing.image_paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("listing-images")
          .remove(listing.image_paths);

        if (storageError) {
          toast.error(`Képek törlése sikertelen: ${storageError.message}`);
          setWorkingId(null);
          return;
        }
      }

      const { error: deleteListingError } = await supabase
        .from("listings")
        .delete()
        .eq("id", req.listing_id);

      if (deleteListingError) {
        toast.error(deleteListingError.message);
        setWorkingId(null);
        return;
      }

      const { error: updateError } = await supabase
        .from("listing_delete_requests")
        .update({
          status: "approved",
          admin_note: adminNotes[req.id] ?? req.admin_note ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (updateError) {
        toast.error(updateError.message);
        setWorkingId(null);
        return;
      }

      toast.success("Törlési kérelem jóváhagyva, aukció törölve.");
      await loadAll();
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectRequest(req: DeleteRequest) {
    setWorkingId(req.id);

    try {
      const { error } = await supabase
        .from("listing_delete_requests")
        .update({
          status: "rejected",
          admin_note: adminNotes[req.id] ?? req.admin_note ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (error) {
        toast.error(error.message);
        setWorkingId(null);
        return;
      }

      toast.success("Törlési kérelem elutasítva.");
      await loadAll();
    } finally {
      setWorkingId(null);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests]
  );

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Törlési kérelmek</h1>
          <p className="text-sm text-muted-foreground">
            Itt látod a felhasználók aukciótörlési kérelmeit.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>Függőben: {pendingCount}</Badge>
          <Badge variant="secondary">Összes: {requests.length}</Badge>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nincs törlési kérelem</CardTitle>
            <CardDescription>Jelenleg nincs feldolgozásra váró kérés.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => {
            const listing = listingsMap[req.listing_id];
            const profile = profilesMap[req.user_id];
            const cover = listing?.image_urls?.[0] ?? null;
            const isPending = req.status === "pending";
            const noteValue = adminNotes[req.id] ?? req.admin_note ?? "";

            return (
              <Card key={req.id} className="overflow-hidden">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
                  <div>
                    {cover ? (
                      <img
                        src={cover}
                        alt={listing?.title ?? "Aukció kép"}
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
                        {listing?.title ?? "Törölt / nem elérhető aukció"}
                      </h2>

                      {req.status === "pending" ? (
                        <Badge>Függőben</Badge>
                      ) : req.status === "approved" ? (
                        <Badge variant="destructive">Jóváhagyva</Badge>
                      ) : (
                        <Badge variant="secondary">Elutasítva</Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div>Kérelmező: {profile?.full_name || "Ismeretlen felhasználó"}</div>
                      <div>Email: {profile?.email || "-"}</div>
                      <div>Létrehozva: {new Date(req.created_at).toLocaleString()}</div>
                    </div>

                    <div className="rounded-xl border p-3 text-sm">
                      <div className="mb-1 font-medium">Felhasználói indok</div>
                      <div className="text-muted-foreground">{req.reason}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Admin megjegyzés</div>
                      <Textarea
                        value={noteValue}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [req.id]: e.target.value,
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
                          onClick={() => approveRequest(req)}
                          disabled={workingId === req.id}
                        >
                          {workingId === req.id ? "Feldolgozás..." : "Jóváhagyás és törlés"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => rejectRequest(req)}
                          disabled={workingId === req.id}
                        >
                          Elutasítás
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Feldolgozva{req.reviewed_at ? `: ${new Date(req.reviewed_at).toLocaleString()}` : "."}
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