// Flip.kz — публичного Merchant API на момент создания приложения нет.
// Поддерживаем ручной импорт остатков через CSV.
// Ожидаемые колонки (любой порядок, разделитель ; или ,):
//   sku, name, quantity, price, warehouse

import type { ConnectorResult, NormalizedStock } from "./types";

export function parseFlipCsv(csv: string): NormalizedStock[] {
  const text = csv.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const firstLine = text.split(/\r?\n/, 1)[0];
  const sep = firstLine.includes(";") ? ";" : ",";
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(sep).map((s) => s.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const iSku = idx("sku");
  const iName = idx("name");
  const iQty = idx("quantity");
  const iPrice = idx("price");
  const iWh = idx("warehouse");
  if (iSku < 0 || iQty < 0) {
    throw new Error("В CSV должны быть колонки sku и quantity");
  }
  const out: NormalizedStock[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = line.split(sep);
    const sku = cells[iSku]?.trim();
    if (!sku) continue;
    out.push({
      sku,
      name: iName >= 0 ? cells[iName]?.trim() : undefined,
      warehouse: iWh >= 0 ? cells[iWh]?.trim() : "Flip",
      quantity: Number(cells[iQty] ?? 0) || 0,
      price: iPrice >= 0 ? Number(cells[iPrice]) || undefined : undefined,
    });
  }
  return out;
}

export function flipResultFromCsv(csv: string): ConnectorResult {
  return { stocks: parseFlipCsv(csv), orders: [] };
}
