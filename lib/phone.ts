export function normalizeHungarianPhone(input: string): string | null {
  const raw = input.replace(/\s+/g, "").replace(/-/g, "").replace(/\(/g, "").replace(/\)/g, "");

  if (!raw) return null;

  if (/^\+36\d{9}$/.test(raw)) return raw;
  if (/^06\d{9}$/.test(raw)) return `+36${raw.slice(2)}`;
  if (/^36\d{9}$/.test(raw)) return `+${raw}`;

  return null;
}