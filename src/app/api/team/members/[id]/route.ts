import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await requireSession();
  if (session.user.role === "MEMBER") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const m = await prisma.membership.findUnique({ where: { id: ctx.params.id } });
  if (!m || m.teamId !== session.user.teamId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (m.role === "OWNER") {
    return NextResponse.json({ error: "Нельзя удалить владельца" }, { status: 400 });
  }
  await prisma.membership.delete({ where: { id: m.id } });
  return NextResponse.json({ ok: true });
}
