import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { SyncRunButton } from "./run-button";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const session = await requireSession();
  const teamId = session.user.teamId;
  const creds = await prisma.marketplaceCredential.findMany({
    where: { teamId },
    select: { id: true, platform: true, label: true },
  });
  const credMap = new Map(creds.map((c) => [c.id, c]));
  const logs = await prisma.syncLog.findMany({
    where: { credentialId: { in: creds.map((c) => c.id) } },
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Синхронизация"
        subtitle="Расписание: Vercel Cron каждые 30 минут. Лог последних запусков"
        actions={<SyncRunButton />}
      />
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Время</th>
              <th>Площадка</th>
              <th>Магазин</th>
              <th>Статус</th>
              <th className="text-right">Остатки</th>
              <th className="text-right">Заказы</th>
              <th>Сообщение</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-10">
                  Журнал пуст. Нажмите «Запустить сейчас».
                </td>
              </tr>
            )}
            {logs.map((l) => {
              const c = credMap.get(l.credentialId);
              const color =
                l.status === "SUCCESS"
                  ? "text-good"
                  : l.status === "ERROR"
                    ? "text-bad"
                    : "text-warn";
              return (
                <tr key={l.id}>
                  <td className="text-muted">{formatDate(l.startedAt)}</td>
                  <td>{c && <PlatformBadge platform={c.platform} />}</td>
                  <td>{c?.label ?? "—"}</td>
                  <td className={color}>{l.status}</td>
                  <td className="text-right">{formatNumber(l.stocksCount)}</td>
                  <td className="text-right">{formatNumber(l.ordersCount)}</td>
                  <td className="max-w-md truncate text-xs text-muted">
                    {l.message ?? ""}
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
