import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseFlipCsv } from "@/lib/connectors/flip";

export const maxDuration = 30;

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await requireSession();
  const cred = await prisma.marketplaceCredential.findUnique({
    where: { id: ctx.params.id },
  });
  if (!cred || cred.teamId !== session.user.teamId || cred.platform !== "FLIP") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const { csv } = await req.json();
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "Пустой CSV" }, { status: 400 });
  }
  let stocks;
  try {
    stocks = parseFlipCsv(csv);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.stockSnapshot.deleteMany({ where: { credentialId: cred.id } }),
    prisma.stockSnapshot.createMany({
      data: stocks.map((s) => ({
        credentialId: cred.id,
        sku: s.sku,
        name: s.name,
        warehouse: s.warehouse,
        quantity: s.quantity,
        price: s.price,
      })),
    }),
    prisma.marketplaceCredential.update({
      where: { id: cred.id },
      data: { lastSyncAt: new Date(), lastError: null },
    }),
  ]);
  await prisma.syncLog.create({
    data: {
      credentialId: cred.id,
      status: "SUCCESS",
      stocksCount: stocks.length,
      finishedAt: new Date(),
      message: "Импорт CSV вручную",
    },
  });
  return NextResponse.json({ imported: stocks.length });
}
