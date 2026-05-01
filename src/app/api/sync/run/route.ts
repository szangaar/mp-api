import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { syncCredential } from "@/lib/sync";

export const maxDuration = 300;

export async function POST() {
  const session = await requireSession();
  const creds = await prisma.marketplaceCredential.findMany({
    where: { teamId: session.user.teamId, isActive: true, platform: { not: "FLIP" } },
  });
  let success = 0;
  let errors = 0;
  for (const c of creds) {
    const r = await syncCredential(c);
    if (r.ok) success++;
    else errors++;
  }
  return NextResponse.json({ total: creds.length, success, errors });
}
