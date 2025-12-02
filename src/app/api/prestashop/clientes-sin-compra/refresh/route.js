// app/api/prestashop/refresh/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClientesObjetivo } from "@/lib/prestashop";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "clientes_inactivos.json");

export async function GET() {
  try {
    const clientes = await getClientesObjetivo(); // ⏳ tarda

    const payload = {
      updatedAt: new Date().toISOString(),
      data: clientes,
    };

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), "utf-8");

    return NextResponse.json(
      {
        ok: true,
        updatedAt: payload.updatedAt,
        count: clientes.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("ERROR refresh:", err);
    return NextResponse.json(
      { error: err.message ?? "Error generando clientes inactivos" },
      { status: 500 }
    );
  }
}
