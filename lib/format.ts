export function formatHuf(n: number) {
  try {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n} Ft`;
  }
}