import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(60),
  teamName: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: "Некорректные поля: " + (e?.message ?? "") },
      { status: 400 },
    );
  }
  const email = body.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "Пользователь с таким email уже существует" },
      { status: 409 },
    );
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const team = await prisma.team.create({ data: { name: body.teamName } });
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: body.name,
      memberships: { create: { teamId: team.id, role: "OWNER" } },
    },
  });
  return NextResponse.json({ id: user.id, teamId: team.id });
}
