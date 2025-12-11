// app/api/prestashop/refresh/route.js
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getClientesObjetivo } from "@/lib/prestashop"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "clientes_inactivos.json")

// 👇 función que hace el laburo pesado y devuelve el payload
async function refreshClientesInactivos() {
  const clientes = await getClientesObjetivo() // ⏳ acá puede tardar lo que sea

  const payload = {
    updatedAt: new Date().toISOString(),
    data: clientes,
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), "utf-8")

  console.log(
    `[refresh clientes inactivos] OK - ${payload.updatedAt} - ${clientes.length} clientes`
  )

  return payload
}

export async function GET() {
  try {
    // 🕒 ahora SÍ esperamos a que termine
    const payload = await refreshClientesInactivos()

    return NextResponse.json(
      {
        ok: true,
        message: "Proceso de refresco finalizado",
        updatedAt: payload.updatedAt,
        count: payload.data.length,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("[refresh clientes inactivos] ERROR en GET:", err)

    return NextResponse.json(
      {
        ok: false,
        error: "Error durante la actualización de clientes inactivos",
        detalle: err?.message,
      },
      { status: 500 }
    )
  }
}
