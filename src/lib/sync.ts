import { prisma } from "./prisma";
import { decryptSecret } from "./crypto";
import { syncByPlatform } from "./connectors";
import type { ConnectorResult } from "./connectors/types";
import type { MarketplaceCredential } from "@prisma/client";

/**
 * Синхронизация одного credential. Заменяет последний снэпшот остатков и
 * мерджит новые заказы.
 */
export async function syncCredential(cred: MarketplaceCredential) {
  const log = await prisma.syncLog.create({
    data: { credentialId: cred.id, status: "RUNNING" },
  });
  try {
    let result: ConnectorResult = { stocks: [], orders: [] };
    if (cred.platform !== "FLIP") {
      const apiKey = decryptSecret(cred.encryptedKey);
      result = await syncByPlatform(cred.platform, {
        clientId: cred.clientId,
        apiKey,
      });
    }

    // 1) Остатки: храним только последний снэпшот (упрощает запросы)
    if (result.stocks.length || cred.platform !== "FLIP") {
      await prisma.$transaction([
        prisma.stockSnapshot.deleteMany({ where: { credentialId: cred.id } }),
        prisma.stockSnapshot.createMany({
          data: result.stocks.map((s) => ({
            credentialId: cred.id,
            sku: s.sku,
            externalId: s.externalId,
            barcode: s.barcode,
            name: s.name,
            warehouse: s.warehouse,
            quantity: s.quantity,
            price: s.price,
          })),
          skipDuplicates: true,
        }),
      ]);
    }

    // 2) Заказы: upsert по (credentialId, externalOrderId)
    for (const o of result.orders) {
      await prisma.orderSnapshot.upsert({
        where: {
          credentialId_externalOrderId: {
            credentialId: cred.id,
            externalOrderId: o.externalOrderId,
          },
        },
        update: {
          status: o.status,
          amount: o.amount,
          quantity: o.quantity ?? 1,
          sku: o.sku,
          createdAtPlatform: o.createdAtPlatform,
          raw: o.raw ? JSON.stringify(o.raw) : undefined,
        },
        create: {
          credentialId: cred.id,
          externalOrderId: o.externalOrderId,
          sku: o.sku,
          status: o.status,
          amount: o.amount,
          quantity: o.quantity ?? 1,
          createdAtPlatform: o.createdAtPlatform,
          raw: o.raw ? JSON.stringify(o.raw) : undefined,
        },
      });
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        stocksCount: result.stocks.length,
        ordersCount: result.orders.length,
      },
    });
    await prisma.marketplaceCredential.update({
      where: { id: cred.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });
    return { ok: true, stocks: result.stocks.length, orders: result.orders.length };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "ERROR", finishedAt: new Date(), message: msg.slice(0, 500) },
    });
    await prisma.marketplaceCredential.update({
      where: { id: cred.id },
      data: { lastError: msg.slice(0, 500) },
    });
    return { ok: false, error: msg };
  }
}

export async function syncAll(): Promise<{
  total: number;
  success: number;
  errors: number;
}> {
  const creds = await prisma.marketplaceCredential.findMany({
    where: { isActive: true, platform: { not: "FLIP" } },
  });
  let success = 0;
  let errors = 0;
  for (const c of creds) {
    const r = await syncCredential(c);
    if (r.ok) success++;
    else errors++;
  }
  return { total: creds.length, success, errors };
}
