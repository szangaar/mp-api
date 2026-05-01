import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { CredentialsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  const session = await requireSession();
  const creds = await prisma.marketplaceCredential.findMany({
    where: { teamId: session.user.teamId },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
  });
  return (
    <>
      <PageHeader
        title="API-ключи"
        subtitle="Подключение Wildberries, Ozon, Kaspi и загрузка CSV для Flip"
      />
      <CredentialsClient
        initial={creds.map((c) => ({
          id: c.id,
          platform: c.platform,
          label: c.label,
          clientId: c.clientId,
          isActive: c.isActive,
          lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
          lastError: c.lastError,
        }))}
      />
    </>
  );
}
