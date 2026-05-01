import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";

const Body = z.object({
  platform: z.enum(["WB", "OZON", "KASPI", "FLIP"]),
  label: z.string().min(1).max(80),
  clientId: z.string().nullable().optional(),
  apiKey: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const session = await requireSession();
  const body = Body.parse(await req.json());
  const cred = await prisma.marketplaceCredential.create({
    data: {
      teamId: session.user.teamId,
      platform: body.platform,
      label: body.label,
      clientId: body.clientId ?? null,
      encryptedKey: encryptSecret(body.apiKey),
    },
  });
  return NextResponse.json({
    id: cred.id,
    platform: cred.platform,
    label: cred.label,
    clientId: cred.clientId,
    isActive: cred.isActive,
    lastSyncAt: cred.lastSyncAt?.toISOString() ?? null,
    lastError: cred.lastError,
  });
}
