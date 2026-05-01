import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { syncCredential } from "@/lib/sync";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await requireSession();
  const cred = await prisma.marketplaceCredential.findUnique({
    where: { id: ctx.params.id },
  });
  if (!cred || cred.teamId !== session.user.teamId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const result = await syncCredential(cred);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result);
}
