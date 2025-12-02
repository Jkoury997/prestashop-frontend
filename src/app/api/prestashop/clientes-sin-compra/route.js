// app/api/prestashop/clientes-sin-compra/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "clientes_inactivos.json"
);

// milisegundos en 1 día
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return NextResponse.json(
        { error: "No hay datos generados todavía. Ejecutá /api/prestashop/clientes-sin-compra/refresh primero." },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const json = JSON.parse(raw);

    const updatedAt = json.updatedAt ? new Date(json.updatedAt) : null;
    const now = new Date();
    let stale = false;

    if (updatedAt) {
      const diff = now.getTime() - updatedAt.getTime();
      stale = diff > ONE_DAY_MS; // más de 1 día
    } else {
      stale = true;
    }

    return NextResponse.json(
      {
        updatedAt: json.updatedAt,
        stale, // true si tiene más de un día
        count: json.data?.length ?? 0,
        clientes: json.data ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("ERROR leyendo cache:", err);
    return NextResponse.json(
      { error: err.message ?? "Error leyendo datos cacheados" },
      { status: 500 }
    );
  }
}
