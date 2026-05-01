// Kaspi.kz Merchant API connector
// Документация: https://kaspi.kz/merchantcabinet/, https://guide.kaspi.kz/partner/ru/shop/api
// Авторизация: header X-Auth-Token
// Заказы: GET https://kaspi.kz/shop/api/v2/orders
// Остатки/оферы: GET https://kaspi.kz/shop/api/v2/offers (требует merchant UID = clientId)

import type {
  ConnectorCredentials,
  ConnectorResult,
  NormalizedOrder,
  NormalizedStock,
} from "./types";
import { ConnectorError } from "./types";

const BASE = "https://kaspi.kz/shop/api/v2";

async function kaspiFetch(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "X-Auth-Token": token,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ConnectorError(
      `Kaspi API ${res.status}: ${res.statusText}`,
      res.status,
      text.slice(0, 1000),
    );
  }
  return res.json();
}

/**
 * Получаем остатки через ленту оферов мерчанта.
 * GET /offers?m=<merchantUid>&page[number]=0&page[size]=100
 * В Kaspi доступны разные ленты в зависимости от тарифа; этот endpoint —
 * базовый список оферов. При отсутствии merchantUid выводим заглушку.
 */
async function fetchStocks(creds: ConnectorCredentials): Promise<NormalizedStock[]> {
  if (!creds.clientId) return []; // без UID мерчанта остатки не получить
  const out: NormalizedStock[] = [];
  for (let page = 0; page < 50; page++) {
    const url =
      `${BASE}/offers?m=${encodeURIComponent(creds.clientId)}` +
      `&page[number]=${page}&page[size]=100`;
    let data: any;
    try {
      data = await kaspiFetch(url, creds.apiKey);
    } catch (e: any) {
      if (e.status === 404 || e.status === 400) break;
      throw e;
    }
    const rows: Array<any> = data?.data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      const a = r.attributes ?? {};
      out.push({
        sku: a.code ?? r.id,
        externalId: r.id,
        name: a.name,
        warehouse: a.cityInfo?.[0]?.cityCode ?? a.availabilities?.[0]?.storeId,
        quantity: a.availableForSale === false
          ? 0
          : Number(a.availabilities?.[0]?.stockCount ?? 0),
        price: Number(a.price ?? 0),
      });
    }
    if (rows.length < 100) break;
  }
  return out;
}

/**
 * Заказы за последние 24 часа.
 * GET /orders?page[number]=0&page[size]=100
 *      &filter[orders][creationDate][$ge]=<ms>
 *      &filter[orders][creationDate][$le]=<ms>
 *      &filter[orders][state]=NEW
 */
async function fetchOrders(creds: ConnectorCredentials): Promise<NormalizedOrder[]> {
  const ge = Date.now() - 1000 * 60 * 60 * 24;
  const le = Date.now();
  const out: NormalizedOrder[] = [];
  for (let page = 0; page < 50; page++) {
    const url =
      `${BASE}/orders?page[number]=${page}&page[size]=100` +
      `&filter[orders][creationDate][$ge]=${ge}` +
      `&filter[orders][creationDate][$le]=${le}`;
    const data = await kaspiFetch(url, creds.apiKey);
    const rows: Array<any> = data?.data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      const a = r.attributes ?? {};
      out.push({
        externalOrderId: r.id,
        status: `${a.state ?? ""}/${a.status ?? ""}`,
        amount: Number(a.totalPrice ?? 0),
        quantity: 1,
        createdAtPlatform: a.creationDate
          ? new Date(Number(a.creationDate))
          : undefined,
        raw: r,
      });
    }
    if (rows.length < 100) break;
  }
  return out;
}

export async function syncKaspi(creds: ConnectorCredentials): Promise<ConnectorResult> {
  const [stocks, orders] = await Promise.all([
    fetchStocks(creds).catch((e) => {
      console.warn("Kaspi stocks failed:", e.message);
      return [] as NormalizedStock[];
    }),
    fetchOrders(creds),
  ]);
  return { stocks, orders };
}

export async function pingKaspi(creds: ConnectorCredentials): Promise<boolean> {
  await kaspiFetch(
    `${BASE}/orders?page[number]=0&page[size]=1`,
    creds.apiKey,
  );
  return true;
}
