import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { AlertCircle, KeyRound, Package, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const teamId = session.user.teamId;

  const creds = await prisma.marketplaceCredential.findMany({
    where: { teamId },
    include: {
      _count: { select: { stocks: true, orders: true } },
    },
    orderBy: { platform: "asc" },
  });

  const credIds = creds.map((c) => c.id);
  const [totalStockAgg, ordersTodayCount, ordersTodaySum, lastSync, perPlatform] =
    await Promise.all([
      prisma.stockSnapshot.aggregate({
        where: { credentialId: { in: credIds } },
        _sum: { quantity: true },
        _count: { _all: true },
      }),
      prisma.orderSnapshot.count({
        where: {
          credentialId: { in: credIds },
          createdAtPlatform: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        },
      }),
      prisma.orderSnapshot.aggregate({
        where: {
          credentialId: { in: credIds },
          createdAtPlatform: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        },
        _sum: { amount: true },
      }),
      prisma.syncLog.findFirst({
        where: { credentialId: { in: credIds } },
        orderBy: { startedAt: "desc" },
      }),
      prisma.stockSnapshot.groupBy({
        by: ["credentialId"],
        where: { credentialId: { in: credIds } },
        _sum: { quantity: true },
      }),
    ]);

  const platformTotals: Record<string, number> = {};
  for (const c of creds) {
    const row = perPlatform.find((p) => p.credentialId === c.id);
    platformTotals[c.platform] =
      (platformTotals[c.platform] ?? 0) + (row?._sum.quantity ?? 0);
  }

  const noKeys = creds.length === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Совокупная картина по всем подключённым маркетплейсам"
      />

      {noKeys ? (
        <div className="card p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warn mt-0.5" />
          <div>
            <div className="font-medium">Нет подключённых API-ключей</div>
            <div className="text-sm text-muted mt-1">
              Чтобы видеть остатки и заказы, добавьте ключи WB / Ozon / Kaspi или
              загрузите CSV для Flip.
            </div>
            <Link href="/credentials" className="btn-primary mt-3 inline-flex">
              <KeyRound className="w-4 h-4" /> Добавить API-ключ
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-muted">Всего SKU</div>
          <div className="kpi-num mt-1">
            {formatNumber(totalStockAgg._count._all)}
          </div>
          <div className="text-xs text-muted mt-1">позиций в снэпшоте</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted">Совокупный остаток</div>
          <div className="kpi-num mt-1">
            {formatNumber(totalStockAgg._sum.quantity ?? 0)}
          </div>
          <div className="text-xs text-muted mt-1">штук на всех площадках</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted">Заказы за 24 ч</div>
          <div className="kpi-num mt-1">{formatNumber(ordersTodayCount)}</div>
          <div className="text-xs text-muted mt-1">
            на сумму {formatNumber(Math.round(ordersTodaySum._sum.amount ?? 0))} ₸/₽
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted">Последняя синхронизация</div>
          <div className="kpi-num mt-1 text-base font-medium">
            {lastSync ? formatDate(lastSync.startedAt) : "—"}
          </div>
          <div className="text-xs text-muted mt-1">
            {lastSync ? `статус: ${lastSync.status}` : "ещё не запускалась"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-accent" />
            <div className="font-medium">Остатки по площадкам</div>
          </div>
          <div className="space-y-3">
            {(["WB", "OZON", "KASPI", "FLIP"] as const).map((p) => (
              <div key={p} className="flex items-center justify-between">
                <PlatformBadge platform={p} />
                <div className="text-sm font-medium">
                  {formatNumber(platformTotals[p] ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-accent" />
            <div className="font-medium">Подключённые магазины</div>
          </div>
          <div className="space-y-2">
            {creds.length === 0 && (
              <div className="text-sm text-muted">Магазины ещё не добавлены.</div>
            )}
            {creds.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border"
              >
                <div className="flex items-center gap-3">
                  <PlatformBadge platform={c.platform} />
                  <div>
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted">
                      {c.lastSyncAt ? `синхр. ${formatDate(c.lastSyncAt)}` : "ещё не синхронизировался"}
                      {c.lastError ? <span className="text-bad"> · ошибка</span> : null}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted">
                  <div>{formatNumber(c._count.stocks)} SKU</div>
                  <div>{formatNumber(c._count.orders)} заказов</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
