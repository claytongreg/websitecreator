import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/usage — Fetch usage records for the current user
export async function GET() {
  // TODO: replace with auth
  const user = await db.user.findFirst();
  if (!user) {
    return NextResponse.json({ records: [], totalCents: 0 });
  }

  const records = await db.usageRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalCents = await db.usageRecord.aggregate({
    where: { userId: user.id },
    _sum: { costCents: true },
  });

  return NextResponse.json({
    records,
    totalCents: totalCents._sum.costCents ?? 0,
  });
}
