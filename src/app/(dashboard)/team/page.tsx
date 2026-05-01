import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TeamClient } from "./client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await requireSession();
  const teamId = session.user.teamId;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return (
    <>
      <PageHeader
        title="Команда"
        subtitle="Лимит — до 10 участников. Все участники работают с одним набором ключей"
      />
      <TeamClient
        teamName={team?.name ?? ""}
        currentRole={session.user.role}
        currentUserId={session.user.id}
        members={
          team?.members.map((m) => ({
            id: m.id,
            email: m.user.email,
            name: m.user.name,
            role: m.role,
            createdAt: m.createdAt.toISOString(),
            userId: m.userId,
          })) ?? []
        }
      />
    </>
  );
}
