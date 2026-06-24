// Build a compact page list with ellipsis, e.g. [1, "…", 4, 5, 6, "…", 20].
export function pageItems(current: number, total: number): (number | "…")[] {
  const set = new Set<number>();
  for (const n of [1, total, current - 1, current, current + 1]) {
    if (n >= 1 && n <= total) set.add(n);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}
