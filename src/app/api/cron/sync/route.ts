import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Vercel Cron вызывает этот endpoint каждые 30 минут (см. vercel.json).
 * Поддерживаются 2 способа авторизации:
 *  1) Vercel Cron автоматически шлёт заголовок `x-vercel-cron` (на платформе)
 *  2) Снаружи — Bearer-токен из ENV CRON_SECRET
 */
export async function GET(req: Request) {
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!isVercelCron && (!process.env.CRON_SECRET || auth !== expected)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await syncAll();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
