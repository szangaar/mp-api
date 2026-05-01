import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await requireSession();
  const teamId = session.user.teamId;
  const creds = await prisma.marketplaceCredential.findMany({
    where: { teamId },
    select: { id: true, platform: true, label: true },
  });
  const credMap = new Map(creds.map((c) => [c.id, c]));
  const orders = await prisma.orderSnapshot.findMany({
    where: { credentialId: { in: creds.map((c) => c.id) } },
    orderBy: [{ createdAtPlatform: "desc" }, { fetchedAt: "desc" }],
    take: 500,
  });

  return (
    <>
      <PageHeader
        title="Заказы"
        subtitle={`Последние заказы со всех площадок (до 500)`}
      />
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Площадка</th>
              <th>Магазин</th>
              <th>№ заказа</th>
              <th>SKU</th>
              <th>Статус</th>
              <th className="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-10">
                  Заказов пока нет.
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const c = credMap.get(o.credentialId);
              return (
                <tr key={o.id}>
                  <td className="text-muted">{formatDate(o.createdAtPlatform)}</td>
                  <td>{c && <PlatformBadge platform={c.platform} />}</td>
                  <td>{c?.label ?? "—"}</td>
                  <td className="font-mono text-xs">{o.externalOrderId}</td>
                  <td className="font-mono text-xs">{o.sku ?? "—"}</td>
                  <td>{o.status ?? "—"}</td>
                  <td className="text-right">
                    {formatNumber(Math.round(o.amount ?? 0))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
