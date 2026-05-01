import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { pingByPlatform } from "@/lib/connectors";

export const maxDuration = 30;

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await requireSession();
  const cred = await prisma.marketplaceCredential.findUnique({
    where: { id: ctx.params.id },
  });
  if (!cred || cred.teamId !== session.user.teamId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (cred.platform === "FLIP") {
    return NextResponse.json({ ok: true, note: "Flip uses CSV import" });
  }
  try {
    const apiKey = decryptSecret(cred.encryptedKey);
    await pingByPlatform(cred.platform, { clientId: cred.clientId, apiKey });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Ping failed" }, { status: 502 });
  }
}
