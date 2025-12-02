// app/api/analytics/products/top/route.js
import { NextResponse } from "next/server";
import { getTopProducts, getTopProductsByCategory } from "@/lib/prestashop-analytics";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days")) || 30;
    const limit = Number(searchParams.get("limit")) || 10;
    const byCategory = searchParams.get("byCategory") === "1";

    if (byCategory) {
      const data = await getTopProductsByCategory({ days, limit });
      return NextResponse.json({ ok: true, days, limit, byCategory: true, data });
    }

    const data = await getTopProducts({ days, limit });
    return NextResponse.json({ ok: true, days, limit, data });
  } catch (err) {
    console.error("ERROR /api/analytics/products/top:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
