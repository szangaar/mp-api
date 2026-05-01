import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StocksTable } from "./table";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const session = await requireSession();
  const teamId = session.user.teamId;

  const creds = await prisma.marketplaceCredential.findMany({
    where: { teamId },
    select: { id: true, platform: true, label: true },
  });
  const credIds = creds.map((c) => c.id);
  const stocks = await prisma.stockSnapshot.findMany({
    where: { credentialId: { in: credIds } },
    select: {
      sku: true,
      externalId: true,
      barcode: true,
      name: true,
      warehouse: true,
      quantity: true,
      price: true,
      credentialId: true,
    },
    take: 20000,
  });

  // Группируем по SKU и собираем колонки по платформам
  const credToPlatform = new Map(creds.map((c) => [c.id, c.platform]));
  type Row = {
    sku: string;
    name?: string;
    barcode?: string;
    externalIds: Record<string, string | undefined>;
    perPlatform: Record<string, number>;
    total: number;
  };
  const map = new Map<string, Row>();
  for (const s of stocks) {
    const key = s.sku;
    if (!key) continue;
    let row = map.get(key);
    if (!row) {
      row = {
        sku: key,
        name: s.name ?? undefined,
        barcode: s.barcode ?? undefined,
        externalIds: {},
        perPlatform: { WB: 0, OZON: 0, KASPI: 0, FLIP: 0 },
        total: 0,
      };
      map.set(key, row);
    }
    if (!row.name && s.name) row.name = s.name;
    if (!row.barcode && s.barcode) row.barcode = s.barcode;
    const pf = credToPlatform.get(s.credentialId);
    if (pf) {
      row.perPlatform[pf] = (row.perPlatform[pf] ?? 0) + s.quantity;
      if (s.externalId && !row.externalIds[pf]) row.externalIds[pf] = s.externalId;
    }
    row.total += s.quantity;
  }
  const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader
        title="Сравнение остатков"
        subtitle={`Всего SKU: ${rows.length} · Площадок подключено: ${creds.length}`}
      />
      <StocksTable rows={rows} />
    </>
  );
}
