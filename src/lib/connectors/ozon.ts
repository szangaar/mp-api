// Ozon Seller API connector
// Документация: https://docs.ozon.ru/api/seller/
// Авторизация: headers Client-Id + Api-Key
// Остатки: POST https://api-seller.ozon.ru/v4/product/info/stocks
// Заказы: POST https://api-seller.ozon.ru/v3/posting/fbs/list

import type {
  ConnectorCredentials,
  ConnectorResult,
  NormalizedOrder,
  NormalizedStock,
} from "./types";
import { ConnectorError } from "./types";

const BASE = "https://api-seller.ozon.ru";

async function ozonFetch(
  path: string,
  creds: ConnectorCredentials,
  body: any,
): Promise<any> {
  if (!creds.clientId) throw new ConnectorError("Ozon Client-Id is required");
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Client-Id": creds.clientId,
      "Api-Key": creds.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ConnectorError(
      `Ozon API ${res.status}: ${res.statusText}`,
      res.status,
      text.slice(0, 1000),
    );
  }
  return res.json();
}

async function fetchStocks(creds: ConnectorCredentials): Promise<NormalizedStock[]> {
  const out: NormalizedStock[] = [];
  let lastId = "";
  // Постранично через cursor
  for (let i = 0; i < 50; i++) {
    const data = await ozonFetch("/v4/product/info/stocks", creds, {
      filter: { visibility: "ALL" },
      last_id: lastId,
      limit: 1000,
    });
    const items: Array<{
      product_id: number;
      offer_id: string;
      stocks?: Array<{
        type?: string;
        present?: number;
        reserved?: number;
      }>;
    }> = data?.result?.items ?? data?.items ?? [];
    for (const it of items) {
      const fbs = it.stocks?.find((s) => s.type === "fbs");
      const fbo = it.stocks?.find((s) => s.type === "fbo");
      const total =
        (fbs?.present ?? 0) + (fbo?.present ?? 0) ||
        (it.stocks?.[0]?.present ?? 0);
      out.push({
        sku: it.offer_id,
        externalId: String(it.product_id),
        warehouse: fbs && fbo ? "FBS+FBO" : fbs ? "FBS" : "FBO",
        quantity: total,
      });
    }
    lastId = data?.result?.last_id ?? data?.last_id ?? "";
    if (!lastId || items.length === 0) break;
  }
  return out;
}

async function fetchOrders(creds: ConnectorCredentials): Promise<NormalizedOrder[]> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const to = new Date().toISOString();
  const data = await ozonFetch("/v3/posting/fbs/list", creds, {
    dir: "ASC",
    filter: { since, to, status: "" },
    limit: 1000,
    offset: 0,
    with: { analytics_data: false, financial_data: true },
  });
  const postings: Array<{
    posting_number: string;
    status?: string;
    in_process_at?: string;
    products?: Array<{ offer_id?: string; price?: string; quantity?: number }>;
    financial_data?: { products?: Array<{ price: string; quantity: number }> };
  }> = data?.result?.postings ?? [];
  return postings.map((p) => {
    const product = p.products?.[0];
    const sumPrice = (p.products ?? []).reduce(
      (acc, x) => acc + Number(x.price ?? 0) * (x.quantity ?? 1),
      0,
    );
    return {
      externalOrderId: p.posting_number,
      sku: product?.offer_id,
      status: p.status,
      amount: sumPrice,
      quantity: product?.quantity ?? 1,
      createdAtPlatform: p.in_process_at ? new Date(p.in_process_at) : undefined,
      raw: p,
    };
  });
}

export async function syncOzon(creds: ConnectorCredentials): Promise<ConnectorResult> {
  const [stocks, orders] = await Promise.all([
    fetchStocks(creds),
    fetchOrders(creds).catch((e) => {
      console.warn("Ozon orders failed:", e.message);
      return [] as NormalizedOrder[];
    }),
  ]);
  return { stocks, orders };
}

export async function pingOzon(creds: ConnectorCredentials): Promise<boolean> {
  await ozonFetch("/v4/product/info/stocks", creds, {
    filter: { visibility: "ALL" },
    last_id: "",
    limit: 1,
  });
  return true;
}
