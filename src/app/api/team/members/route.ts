import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const Body = z.object({
  email: z.string().email(),
  name: z.string().max(60).optional(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.user.role === "MEMBER") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = Body.parse(await req.json());
  const teamId = session.user.teamId;

  const count = await prisma.membership.count({ where: { teamId } });
  if (count >= 10) {
    return NextResponse.json(
      { error: "Достигнут лимит команды (10 человек)" },
      { status: 400 },
    );
  }
  const email = body.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });
  if (existing) {
    if (existing.memberships.some((m) => m.teamId === teamId)) {
      return NextResponse.json(
        { error: "Пользователь уже в команде" },
        { status: 409 },
      );
    }
    if (existing.memberships.length > 0) {
      return NextResponse.json(
        { error: "Пользователь уже привязан к другой команде" },
        { status: 409 },
      );
    }
    await prisma.membership.create({
      data: { userId: existing.id, teamId, role: "MEMBER" },
    });
    return NextResponse.json({ ok: true });
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  await prisma.user.create({
    data: {
      email,
      name: body.name ?? null,
      passwordHash,
      memberships: { create: { teamId, role: "MEMBER" } },
    },
  });
  return NextResponse.json({ ok: true });
}
