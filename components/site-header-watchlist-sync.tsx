"use client";

import { useEffect } from "react";

export function SiteHeaderWatchlistSync({
  onChanged,
}: {
  onChanged: () => void;
}) {
  useEffect(() => {
    function handler() {
      onChanged();
    }

    window.addEventListener("watchlist-changed", handler);
    return () => window.removeEventListener("watchlist-changed", handler);
  }, [onChanged]);

  return null;
}