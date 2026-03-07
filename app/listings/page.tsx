import { Suspense } from "react";
import ListingsPageClient from "./listings-page-client";

export const dynamic = "force-dynamic";

export default function ListingsPage() {
  return (
    <Suspense fallback={null}>
      <ListingsPageClient />
    </Suspense>
  );
}