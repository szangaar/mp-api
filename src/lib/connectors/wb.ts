// Wildberries API connector
// Документация: https://dev.wildberries.ru/openapi/
// Авторизация: header Authorization: <JWT-token>
// Остатки (новый метод): POST https://seller-analytics-api.wildberries.ru/api/v1/warehouse_remains
//   (старый /api/v1/supplier/stocks отключается 23.06)
// Заказы FBS: GET https://marketplace-api.wildberries.ru/api/v3/orders

import type {
  ConnectorCredentials,
  ConnectorResult,
  NormalizedOrder,
  NormalizedStock,
} from "./types";
import { ConnectorError } from "./types";

const STATS_BASE = "https://statistics-api.wildberries.ru";
const MARKETPLACE_BASE = "https://marketplace-api.wildberries.ru";

async function wbFetch(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ConnectorError(
      `WB API ${res.status}: ${res.statusText}`,
      res.status,
      text.slice(0, 1000),
    );
  }
  return res.json();
}

/**
 * Получает остатки через Statistics API.
 * Метод GET /api/v1/supplier/stocks?dateFrom=YYYY-MM-DD
 * Возвращает массив остатков на складах WB.
 */
async function fetchStocks(token: string): Promise<NormalizedStock[]> {
  const dateFrom = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
    .toISOString()
    .slice(0, 10);
  const url = `${STATS_BASE}/api/v1/supplier/stocks?dateFrom=${dateFrom}`;
  const data = (await wbFetch(url, token)) as Array<{
    nmId: number;
    chrtId?: number;
    barcode: string;
    supplierArticle: string;
    techSize?: string;
    subject?: string;
    warehouseName?: string;
    quantity: number;
    Price?: number;
    Discount?: number;
  }>;
  return (data || []).map((row) => ({
    sku: row.supplierArticle || String(row.nmId),
    externalId: String(row.chrtId ?? row.nmId),
    barcode: row.barcode,
    name: row.subject,
    warehouse: row.warehouseName,
    quantity: row.quantity ?? 0,
    price: row.Price ?? undefined,
  }));
}

/**
 * Получает FBS-заказы за последние 24 часа.
 * GET /api/v3/orders?next=0&limit=1000&dateFrom=<unix>
 */
async function fetchOrders(token: string): Promise<NormalizedOrder[]> {
  const dateFrom = Math.floor((Date.now() - 1000 * 60 * 60 * 24) / 1000);
  const url = `${MARKETPLACE_BASE}/api/v3/orders?limit=1000&next=0&dateFrom=${dateFrom}`;
  const data = (await wbFetch(url, token)) as {
    orders?: Array<{
      id: number;
      article?: string;
      createdAt: string;
      price?: number;
      convertedPrice?: number;
      offices?: string[];
      skus?: string[];
    }>;
  };
  return (data.orders || []).map((o) => ({
    externalOrderId: String(o.id),
    sku: o.article ?? o.skus?.[0],
    status: "new",
    amount: (o.convertedPrice ?? o.price ?? 0) / 100,
    quantity: 1,
    createdAtPlatform: o.createdAt ? new Date(o.createdAt) : undefined,
    raw: o,
  }));
}

export async function syncWildberries(
  creds: ConnectorCredentials,
): Promise<ConnectorResult> {
  const token = creds.apiKey.trim();
  if (!token) throw new ConnectorError("WB token is empty");

  const [stocks, orders] = await Promise.all([
    fetchStocks(token).catch((e) => {
      throw new ConnectorError(`WB stocks: ${e.message}`, e.status);
    }),
    fetchOrders(token).catch((e) => {
      // Заказы — некритично, без них всё равно вернём остатки
      console.warn("WB orders failed:", e.message);
      return [] as NormalizedOrder[];
    }),
  ]);
  return { stocks, orders };
}

export async function pingWildberries(creds: ConnectorCredentials): Promise<boolean> {
  const token = creds.apiKey.trim();
  // ping — короткий запрос за остатками за вчерашний день, не трогаем заказы
  const dateFrom = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  await wbFetch(`${STATS_BASE}/api/v1/supplier/stocks?dateFrom=${dateFrom}`, token);
  return true;
}
