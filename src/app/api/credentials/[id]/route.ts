import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } },
) {
  const session = await requireSession();
  const cred = await prisma.marketplaceCredential.findUnique({
    where: { id: ctx.params.id },
  });
  if (!cred || cred.teamId !== session.user.teamId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  await prisma.marketplaceCredential.delete({ where: { id: cred.id } });
  return NextResponse.json({ ok: true });
}
