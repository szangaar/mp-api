"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type Row = {
  sku: string;
  name?: string;
  barcode?: string;
  externalIds: Record<string, string | undefined>;
  perPlatform: Record<string, number>;
  total: number;
};

const PLATFORMS = ["WB", "OZON", "KASPI", "FLIP"] as const;
const HEADERS: Record<string, string> = {
  WB: "WB (chrtId)",
  OZON: "Ozon (sku)",
  KASPI: "Kaspi (id)",
  FLIP: "Flip",
};

export function StocksTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [onlyMismatch, setOnlyMismatch] = useState(false);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyMismatch) {
        const vals = PLATFORMS.map((p) => r.perPlatform[p] ?? 0).filter((v) => v > 0);
        if (vals.length < 2) return false;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        if (max - min < 1) return false;
      }
      if (!ql) return true;
      return (
        r.sku.toLowerCase().includes(ql) ||
        r.name?.toLowerCase().includes(ql) ||
        r.barcode?.toLowerCase().includes(ql) ||
        Object.values(r.externalIds).some((v) => v?.toLowerCase().includes(ql))
      );
    });
  }, [rows, q, onlyMismatch]);

  function exportCsv() {
    const head = ["SKU", "Название", "Штрихкод", ...PLATFORMS, "Итого"].join(";");
    const lines = filtered.map((r) =>
      [
        r.sku,
        r.name ?? "",
        r.barcode ?? "",
        ...PLATFORMS.map((p) => r.perPlatform[p] ?? 0),
        r.total,
      ]
        .map((x) => String(x).replaceAll(";", ","))
        .join(";"),
    );
    const blob = new Blob(["\uFEFF" + [head, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stocks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по SKU, названию, штрихкоду, chrtId, offer_id…"
            className="input pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={onlyMismatch}
            onChange={(e) => setOnlyMismatch(e.target.checked)}
          />
          Только расхождения
        </label>
        <button onClick={exportCsv} className="btn-ghost">
          <Download className="w-4 h-4" /> Экспорт CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Название</th>
              {PLATFORMS.map((p) => (
                <th key={p} className="text-right">
                  {HEADERS[p]}
                </th>
              ))}
              <th className="text-right">Итого</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2 + PLATFORMS.length + 1} className="text-center text-muted py-10">
                  Нет данных. Подключите ключи и запустите синхронизацию.
                </td>
              </tr>
            )}
            {filtered.slice(0, 1000).map((r) => {
              const vals = PLATFORMS.map((p) => r.perPlatform[p] ?? 0);
              const filled = vals.filter((v) => v > 0);
              const mismatch =
                filled.length >= 2 && Math.max(...filled) - Math.min(...filled) >= 1;
              return (
                <tr key={r.sku}>
                  <td className="font-mono text-xs">{r.sku}</td>
                  <td className="max-w-xs truncate text-muted">{r.name ?? "—"}</td>
                  {PLATFORMS.map((p) => {
                    const v = r.perPlatform[p] ?? 0;
                    const ext = r.externalIds[p];
                    return (
                      <td key={p} className="text-right">
                        <div
                          className={
                            v === 0
                              ? "text-muted"
                              : mismatch
                                ? "text-warn font-medium"
                                : "text-text"
                          }
                        >
                          {formatNumber(v)}
                        </div>
                        {ext && <div className="text-[10px] text-muted">{ext}</div>}
                      </td>
                    );
                  })}
                  <td className="text-right font-semibold">{formatNumber(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 1000 && (
          <div className="p-3 text-xs text-muted text-center">
            Показаны первые 1000 строк. Воспользуйтесь поиском или экспортом.
          </div>
        )}
      </div>
    </>
  );
}
