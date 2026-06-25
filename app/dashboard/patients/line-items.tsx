"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { formatRs } from "@/lib/format";

export type CatalogOption = { id: string; name: string; rate: number };
export type ChosenItem = { id: string; rate: number };

type Row = { key: number; id: string; rate: string };

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

// A rows editor: pick an item from `catalog` (auto-fills its rate, which stays
// editable for discounts); selecting in the last row spawns a new empty row.
// Reports the chosen items (those with a selection) to the parent via onChange.
export default function LineItems({
  title,
  catalog,
  emptyHint,
  onChange,
}: {
  title: string;
  catalog: CatalogOption[];
  emptyHint: string;
  onChange: (items: ChosenItem[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => [{ key: 0, id: "", rate: "" }]);
  const keyRef = useRef(0);
  const map = new Map(catalog.map((c) => [c.id, c]));

  function commit(next: Row[]) {
    setRows(next);
    onChange(
      next
        .filter((r) => r.id)
        .map((r) => ({ id: r.id, rate: parseInt(r.rate, 10) || 0 })),
    );
  }

  function setItem(key: number, id: string) {
    const rate = map.get(id)?.rate;
    const next = rows.map((x) =>
      x.key === key
        ? { ...x, id, rate: rate != null ? String(rate) : x.rate }
        : x,
    );
    const last = next[next.length - 1];
    if (id && last.key === key) {
      next.push({ key: ++keyRef.current, id: "", rate: "" });
    }
    commit(next);
  }
  function setRate(key: number, rate: string) {
    commit(
      rows.map((x) =>
        x.key === key ? { ...x, rate: rate.replace(/\D/g, "") } : x,
      ),
    );
  }
  function removeRow(key: number) {
    let next = rows.filter((x) => x.key !== key);
    if (!next.length) next = [{ key: ++keyRef.current, id: "", rate: "" }];
    commit(next);
  }

  return (
    <div className="border-t border-edge pt-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {catalog.length === 0 && (
        <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          {emptyHint}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_6rem_auto] items-center gap-2"
          >
            <select
              value={row.id}
              onChange={(e) => setItem(row.key, e.target.value)}
              className={fieldClass}
            >
              <option value="" disabled>
                Select
              </option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatRs(c.rate)})
                </option>
              ))}
            </select>
            <input
              value={row.rate}
              onChange={(e) => setRate(row.key, e.target.value)}
              inputMode="numeric"
              placeholder="Rate"
              title="Rate (editable for discount)"
              className={`${fieldClass} text-right`}
            />
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="rounded-md p-2 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
