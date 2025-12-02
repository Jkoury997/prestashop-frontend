"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, TrendingDown, DollarSign, Users, ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function GeografiaPage() {
  const [provinceData, setProvinceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // 👉 Traemos los mismos clientes inactivos de la API cacheada
        const res = await fetch("/api/prestashop/clientes-sin-compra")
        const data = await res.json()

        const apiClientes = data.clientes || []

        // Mapear a la estructura que necesitamos acá
        const inactive = apiClientes.map((c) => ({
          provincia: c.province || "Sin Provincia",
          total4Meses: c.total_amount_last_4_months || 0,
          pedidos4Meses: c.orders_count_last_4_months || 0,
        }))

        // Agrupar clientes por provincia
        const groupedByProvince = inactive.reduce((acc, customer) => {
          const provincia = customer.provincia || "Sin Provincia"

          if (!acc[provincia]) {
            acc[provincia] = {
              provincia,
              clientes: [],
              totalClientes: 0,
              totalPerdido: 0,
              totalPedidos: 0,
            }
          }

          acc[provincia].clientes.push(customer)
          acc[provincia].totalClientes++
          acc[provincia].totalPerdido += customer.total4Meses || 0
          acc[provincia].totalPedidos += customer.pedidos4Meses || 0

          return acc
        }, {})

        // Convertir a array y ordenar por pérdida total
        const provincesArray = Object.values(groupedByProvince)
          .map((prov) => ({
            ...prov,
            ticketPromedio:
              prov.totalPedidos > 0 ? prov.totalPerdido / prov.totalPedidos : 0,
            perdidaPromedioPorCliente:
              prov.totalClientes > 0 ? prov.totalPerdido / prov.totalClientes : 0,
          }))
          .sort((a, b) => b.totalPerdido - a.totalPerdido)

        setProvinceData(provincesArray)
      } catch (err) {
        console.error(err)
        setError(err.message || "Error cargando datos")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const totalClientesInactivos = provinceData.reduce(
    (sum, p) => sum + p.totalClientes,
    0,
  )
  const totalPerdidaGeneral = Math.round(
  provinceData.reduce(
    (sum, p) => sum + (p.totalPerdido || 0),
    0,
  ) / 4,
)
  const provinciasAfectadas = provinceData.length
  const peorProvincia = provinceData[0]

  // Calcular el color de intensidad basado en la pérdida
  const getIntensityColor = (perdida) => {
    const maxPerdida = provinceData[0]?.totalPerdido || 1
    const intensity = (perdida / maxPerdida) * 100

    if (intensity >= 80) return "bg-red-500/20 border-red-500/40 text-red-300"
    if (intensity >= 60) return "bg-orange-500/20 border-orange-500/40 text-orange-300"
    if (intensity >= 40) return "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
    if (intensity >= 20) return "bg-blue-500/20 border-blue-500/40 text-blue-300"
    return "bg-slate-500/20 border-slate-500/40 text-slate-300"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando análisis geográfico...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/ecommerce/prestashop/clientes-sin-compra">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Análisis Geográfico
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pérdidas automáticas por provincia - Clientes inactivos del último mes
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">Exportar Reporte</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Resumen General */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Provincias Afectadas
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {provinciasAfectadas}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Clientes Inactivos
                </p>
                <p className="mt-2 text-3xl font-bold text-destructive">
                  {totalClientesInactivos}
                </p>
              </div>
              <div className="rounded-full bg-destructive/10 p-3">
                <Users className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pérdida Total Promedio por Mes
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  ${totalPerdidaGeneral.toLocaleString("es-AR")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Últimos 4 meses
                </p>
              </div>
              <div className="rounded-full bg-chart-3/10 p-3">
                <DollarSign className="h-6 w-6 text-chart-3" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Provincia Crítica
                </p>
                <p className="mt-2 text-xl font-bold text-destructive">
                  {peorProvincia?.provincia || "N/A"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  $
                  {peorProvincia
                    ? peorProvincia.totalPerdido.toLocaleString("es-AR")
                    : 0}{" "}
                  perdidos
                </p>
              </div>
              <div className="rounded-full bg-destructive/10 p-3">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>
        </div>

        {/* Mapa de Calor */}
        <Card className="mb-8">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Mapa de Intensidad de Pérdidas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Visualización de pérdidas por provincia - Rojo indica mayor pérdida
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {provinceData.map((prov) => (
                <Card
                  key={prov.provincia}
                  className={`border-2 p-4 transition-all hover:scale-105 cursor-pointer ${getIntensityColor(
                    prov.totalPerdido,
                  )}`}
                >
                  <div className="flex flex-col items-center text-center">
                    <MapPin className="h-8 w-8 mb-2" />
                    <h3 className="font-bold text-sm mb-1">{prov.provincia}</h3>
                    <div className="text-xs opacity-90">
                      {prov.totalClientes} cliente
                      {prov.totalClientes !== 1 ? "s" : ""}
                    </div>
                    <div className="mt-2 text-lg font-bold">
                      ${prov.totalPerdido.toLocaleString("es-AR")}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        {/* Tabla Detallada */}
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Detalle por Provincia
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranking de provincias por pérdida potencial
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ranking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Provincia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Clientes Inactivos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pedidos (4M)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pérdida Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pérdida por Cliente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ticket Promedio
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Criticidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {provinceData.map((prov, index) => (
                  <tr
                    key={prov.provincia}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <Badge
                          variant={
                            index === 0
                              ? "destructive"
                              : index < 3
                              ? "secondary"
                              : "outline"
                          }
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">
                            {prov.provincia}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {prov.totalClientes}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-muted-foreground">
                        {prov.totalPedidos}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-destructive text-lg">
                        $
                        {prov.totalPerdido.toLocaleString("es-AR", {
                          minimumFractionDigits: 0,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-foreground">
                        $
                        {prov.perdidaPromedioPorCliente.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-muted-foreground">
                        $
                        {prov.ticketPromedio.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge
                        variant={
                          index === 0
                            ? "destructive"
                            : index < 3
                            ? "default"
                            : index < 5
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {index === 0
                          ? "Crítico"
                          : index < 3
                          ? "Alto"
                          : index < 5
                          ? "Medio"
                          : "Bajo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Leyenda del Mapa de Calor */}
        <Card className="mt-6">
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Leyenda de Intensidad
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border-2 border-red-500/40"></div>
                <span className="text-xs text-muted-foreground">
                  Crítico (80-100%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500/20 border-2 border-orange-500/40"></div>
                <span className="text-xs text-muted-foreground">
                  Alto (60-80%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/20 border-2 border-yellow-500/40"></div>
                <span className="text-xs text-muted-foreground">
                  Medio (40-60%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/20 border-2 border-blue-500/40"></div>
                <span className="text-xs text-muted-foreground">
                  Bajo (20-40%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-500/20 border-2 border-slate-500/40"></div>
                <span className="text-xs text-muted-foreground">
                  Mínimo (0-20%)
                </span>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
