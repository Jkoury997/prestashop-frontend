"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Mail,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  MessageCircle,
  MapPin,
  Phone,
} from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function Page() {
  const [customers, setCustomers] = useState([])
  const [filterType, setFilterType] = useState("Todos")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [stale, setStale] = useState(false)

  // 👉 Cargar datos desde tu API Next
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/prestashop/clientes-sin-compra")
        if (!res.ok) {
          throw new Error("Error al cargar clientes inactivos")
        }

        const data = await res.json()
        console.log("DATA RECIBIDA →", data)

        const apiClientes = data.clientes || []

        const mapped = apiClientes.map((c) => {
          const lastOrderDate = c.last_order ? new Date(c.last_order) : null
          const daysSinceLastPurchase = lastOrderDate
            ? Math.floor(
                (Date.now() - lastOrderDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0

          const pedidos4Meses = c.orders_count_last_4_months || 0
          const total4Meses = c.total_amount_last_4_months || 0
          const ticketPromedio =
            pedidos4Meses > 0 ? total4Meses / pedidos4Meses : 0

          return {
            id: c.id,
            nombre: c.firstname,
            apellido: c.lastname,
            nombreCompleto: `${c.firstname} ${c.lastname}`.trim(),
            email: c.email,
            telefono: c.phone || "",
            provincia: c.province || "",
            tipoCliente: c.customer_type,
            daysSinceLastPurchase,
            pedidos4Meses,
            total4Meses,
            ticketPromedio,
          }
        })

        setCustomers(mapped)
        setUpdatedAt(data.updatedAt || null)
        setStale(Boolean(data.stale))
      } catch (err) {
        console.error(err)
        setError(err.message || "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const totalCustomers = customers.length

  const filteredCustomers = customers.filter((customer) => {
    if (filterType === "Todos") return true
    return customer.tipoCliente === filterType
  })

  const inactiveCount = filteredCustomers.length
  const inactiveRate =
    totalCustomers > 0 ? ((inactiveCount / totalCustomers) * 100).toFixed(1) : "0"

  const totalLostRevenue = Math.round(
  filteredCustomers.reduce(
    (sum, c) => sum + (c.total4Meses || 0),
    0
  ) / 4
)

  const totalPedidos4Meses = filteredCustomers.reduce(
  (sum, c) => sum + (c.pedidos4Meses || 0),
  0,
)

  const avgTicket =
    totalPedidos4Meses > 0 ? totalLostRevenue / totalPedidos4Meses : 0

  const handleContactWhatsApp = (telefono, nombre) => {
    if (!telefono) return
    const cleanPhone = telefono.replace(/\D/g, "")
    const message = encodeURIComponent(
      `Hola ${nombre}, notamos que no has comprado en el último mes. ¿Podemos ayudarte en algo? 😊`,
    )
    window.open(`https://wa.me/54${cleanPhone}?text=${message}`, "_blank")
  }

  const handleContactEmail = (email, nombre) => {
    if (!email) return
    const subject = encodeURIComponent("¡Te extrañamos! Oferta especial para ti")
    const body = encodeURIComponent(
      `Hola ${nombre},\n\nNotamos que no has realizado compras en el último mes y queríamos contactarte.\n\n¿Hay algo en lo que podamos ayudarte?\n\nSaludos cordiales`,
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  const handleContactAll = () => {
    const emails = filteredCustomers
      .map((c) => c.email)
      .filter(Boolean)
      .join(",")
    if (!emails) return
    const subject = encodeURIComponent("¡Te extrañamos! Oferta especial")
    window.location.href = `mailto:${emails}?subject=${subject}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando clientes inactivos...
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Análisis de Clientes Inactivos
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Clientes sin compras en el último mes - Historial de 4 meses anteriores
              </p>

              {/* 🔹 Banner de actualización */}
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  Última actualización:{" "}
                  {updatedAt
                    ? new Date(updatedAt).toLocaleString("es-AR")
                    : "Sin datos"}
                </span>
                {stale && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    Datos desactualizados, volver a generar desde /api/prestashop/clientes-sin-compra/refresh
                  </span>
                )}
              </div>
            </div>
             <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/ecommerce/prestashop/clientes-sin-compra/geografia">Ver Análisis Geográfico</Link>
              </Button>
              <Button variant="outline">Exportar CSV</Button>
              <Button onClick={handleContactAll} className="gap-2">
                <Mail className="h-4 w-4" />
                Contactar Todos
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Clientes
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {totalCustomers}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
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
                  {inactiveCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inactiveRate}% del total
                </p>
              </div>
              <div className="rounded-full bg-destructive/10 p-3">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ticket Promedio
                </p>
                <p className="mt-2 text-2xl font-bold text-chart-2">
                 
                   ${avgTicket.toLocaleString("es-AR")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Últimos 4 meses
                </p>
              </div>
              <div className="rounded-full bg-chart-2/10 p-3">
                <ShoppingCart className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ingresos en Riesgo Promedio
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                 ${totalLostRevenue.toLocaleString("es-AR")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Basado en 4 meses
                </p>
              </div>
              <div className="rounded-full bg-chart-3/10 p-3">
                <DollarSign className="h-6 w-6 text-chart-3" />
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Clientes sin compras en el último mes ({inactiveCount})
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mostrando pedidos y totales de los 4 meses anteriores (sin incluir el mes actual)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "Todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("Todos")}
                >
                  Todos
                </Button>
                <Button
                  variant={filterType === "Minorista" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("Minorista")}
                >
                  Minorista
                </Button>
                <Button
                  variant={filterType === "Revendedoras" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("Revendedoras")}
                >
                  Revendedoras
                </Button>
                <Button
                  variant={
                    filterType === "Compra por Mayor" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setFilterType("Compra por Mayor")}
                >
                  Mayor
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Días Inactivo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pedidos (4M Anteriores)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total (4M Anteriores)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ticket Promedio
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        #{customer.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {customer.nombre.charAt(0)}
                          {customer.apellido.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-foreground">
                            {customer.nombreCompleto}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">
                            {customer.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.telefono}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {customer.provincia}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          customer.tipoCliente === "Compra por Mayor"
                            ? "default"
                            : customer.tipoCliente === "Revendedoras"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {customer.tipoCliente}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          customer.daysSinceLastPurchase > 60
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {customer.daysSinceLastPurchase} días
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-foreground">
                        {customer.pedidos4Meses}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-foreground">
                        {(customer.total4Meses || 0).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-muted-foreground">
                        {customer.ticketPromedio.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleContactEmail(
                              customer.email,
                              customer.nombre,
                            )
                          }
                          className="gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          Email
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleContactWhatsApp(
                              customer.telefono,
                              customer.nombreCompleto,
                            )
                          }
                          className="gap-1"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}
