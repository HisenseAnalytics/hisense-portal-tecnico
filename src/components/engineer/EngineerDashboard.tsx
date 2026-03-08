"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Profile } from "@/lib/types"
import { LogOut, Search, Filter, Download } from "lucide-react"

interface Store {
  name: string
  city: string
}

interface Assignment {
  store: Store
}

interface AssignedUnit {
  store_model: string
  store_serial: string
  assignment: Assignment
}

interface Technician {
  full_name: string
}

interface InspectionRow {
  id: string
  created_at: string
  verified_model: string
  verified_serial: string
  model_matches: boolean
  serial_matches: boolean
  fault_category: string
  fault_detail: string | null
  technician: Technician | null
  assigned_unit: AssignedUnit | null
}

interface Props {
  profile: Profile
  inspections: InspectionRow[]
}

const FAULT_LABELS: Record<string, string> = {
  aesthetic_damage: "Dano estetico",
  structural_impact: "Golpe estructural",
  water_damage: "Dano por agua",
  used_merchandise: "Mercancia usada",
  damaged_packaging: "Embalaje danado",
  incomplete_product: "Producto incompleto",
  no_power: "No enciende",
  electrical_fault: "Averia electrica",
  mechanical_fault: "Averia mecanica",
  software_fault: "Fallo de software",
  abnormal_noise: "Ruido anormal",
  gas_leak: "Perdida de gas",
  no_fault_found: "Sin averia (NFF)",
}

export default function EngineerDashboard({ profile, inspections }: Props) {
  const [search, setSearch] = useState("")
  const [filterFault, setFilterFault] = useState("")
  const [filterStore, setFilterStore] = useState("")
  const [filterMatch, setFilterMatch] = useState("")

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const stores = [...new Set(
    inspections
      .map(i => i.assigned_unit?.assignment?.store?.name ?? "")
      .filter(s => s !== "")
  )]

  const filtered = inspections.filter(i => {
    const matchSearch =
      !search ||
      i.verified_model?.toLowerCase().includes(search.toLowerCase()) ||
      i.verified_serial?.toLowerCase().includes(search.toLowerCase()) ||
      i.technician?.full_name?.toLowerCase().includes(search.toLowerCase())

    const matchFault = !filterFault || i.fault_category === filterFault
    const matchStore = !filterStore || (i.assigned_unit?.assignment?.store?.name ?? "") === filterStore
    const matchMatch =
      !filterMatch ||
      (filterMatch === "match" && i.model_matches && i.serial_matches) ||
      (filterMatch === "mismatch" && (!i.model_matches || !i.serial_matches))

    return matchSearch && matchFault && matchStore && matchMatch
  })

  const exportCSV = () => {
    const headers = [
      "Fecha", "Tecnico", "Tienda", "Modelo Tienda", "Serie Tienda",
      "Modelo Verificado", "Serie Verificada", "Modelo Coincide", "Serie Coincide",
      "Clasificacion", "Detalle"
    ]
    const rows = filtered.map(i => [
      new Date(i.created_at).toLocaleDateString("es-ES"),
      i.technician?.full_name ?? "",
      i.assigned_unit?.assignment?.store?.name ?? "",
      i.assigned_unit?.store_model ?? "",
      i.assigned_unit?.store_serial ?? "",
      i.verified_model,
      i.verified_serial,
      i.model_matches ? "Si" : "No",
      i.serial_matches ? "Si" : "No",
      FAULT_LABELS[i.fault_category] || i.fault_category,
      i.fault_detail ?? "",
    ])

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `revisiones_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-widest text-blue-600">HISENSE</div>
            <p className="text-xs text-gray-400 mt-0.5">Panel de ingeniero</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition"
            >
              <Download size={15} />
              Exportar CSV
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400">Total revisiones</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{inspections.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400">Coincidencias OK</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {inspections.filter(i => i.model_matches && i.serial_matches).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400">Discrepancias</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">
              {inspections.filter(i => !i.model_matches || !i.serial_matches).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400">Sin averia (NFF)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {inspections.filter(i => i.fault_category === "no_fault_found").length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar modelo, serie, tecnico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterFault}
              onChange={(e) => setFilterFault(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos los fallos</option>
              {Object.entries(FAULT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todas las tiendas</option>
              {stores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterMatch}
              onChange={(e) => setFilterMatch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todas las coincidencias</option>
              <option value="match">Coinciden</option>
              <option value="mismatch">Discrepancia</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {filtered.length} revisiones
            </p>
            <Filter size={14} className="text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tecnico</th>
                  <th className="px-4 py-3 text-left">Tienda</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-left">Serie</th>
                  <th className="px-4 py-3 text-left">Coincide</th>
                  <th className="px-4 py-3 text-left">Fallo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(i.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {i.technician?.full_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {i.assigned_unit?.assignment?.store?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{i.verified_model}</div>
                      {!i.model_matches && (
                        <div className="text-xs text-amber-500">Ref: {i.assigned_unit?.store_model}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{i.verified_serial}</div>
                      {!i.serial_matches && (
                        <div className="text-xs text-amber-500">Ref: {i.assigned_unit?.store_serial}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        i.model_matches && i.serial_matches
                          ? "bg-green-50 text-green-600"
                          : "bg-amber-50 text-amber-500"
                      }`}>
                        {i.model_matches && i.serial_matches ? "Si" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{FAULT_LABELS[i.fault_category]}</div>
                      {i.fault_detail && (
                        <div className="text-xs text-gray-400 truncate max-w-32">{i.fault_detail}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
