"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Profile } from "@/lib/types"
import { LogOut, Search, Filter, Download, X, Camera, ChevronDown } from "lucide-react"

interface Store { name: string; city: string }
interface Assignment { store: Store }
interface AssignedUnit {
  store_model: string
  store_serial: string
  store_internal_id: string | null
  assignment: Assignment
}
interface Technician { full_name: string }

interface InspectionRow {
  id: string
  created_at: string
  verified_model: string
  verified_serial: string
  model_matches: boolean
  serial_matches: boolean
  fault_category: string
  fault_detail: string | null
  photo_model_url: string | null
  photo_serial_url: string | null
  photo_fault_url: string | null
  engineer_status: string | null
  engineer_comment: string | null
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
  functional_fault: "Averia funcional",
  abnormal_noise: "Ruido anormal",
  gas_leak: "Perdida de gas",
  no_fault_found: "Sin averia (NFF)",
}

const STATUS_OPTIONS = [
  { value: "accepted", label: "Aceptado", color: "bg-green-50 text-green-600 border-green-200" },
  { value: "rejected", label: "Rechazado", color: "bg-red-50 text-red-500 border-red-200" },
  { value: "verify", label: "Verificar", color: "bg-amber-50 text-amber-600 border-amber-200" },
]

const REJECT_COMMENTS = [
  "Informacion insuficiente",
  "Fotos no validas o borrosas",
  "Clasificacion de fallo incorrecta",
  "Datos del equipo no coinciden",
  "Devolucion no justificada",
  "Duplicado de caso existente",
  "Otro (ver comentario)",
]

export default function EngineerDashboard({ profile, inspections: initialInspections }: Props) {
  const [inspections, setInspections] = useState<InspectionRow[]>(initialInspections)
  const [search, setSearch] = useState("")
  const [filterFault, setFilterFault] = useState("")
  const [filterStore, setFilterStore] = useState("")
  const [filterMatch, setFilterMatch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [selectedInspection, setSelectedInspection] = useState<InspectionRow | null>(null)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [commentModal, setCommentModal] = useState<{ id: string; preset: string; custom: string } | null>(null)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const stores = [...new Set<string>(
    inspections.map(i => i.assigned_unit?.assignment?.store?.name ?? "").filter(s => s !== "")
  )]

  const filtered = inspections.filter(i => {
    const matchSearch = !search ||
      i.verified_model?.toLowerCase().includes(search.toLowerCase()) ||
      i.verified_serial?.toLowerCase().includes(search.toLowerCase()) ||
      i.technician?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchFault = !filterFault || i.fault_category === filterFault
    const matchStore = !filterStore || (i.assigned_unit?.assignment?.store?.name ?? "") === filterStore
    const matchMatch = !filterMatch ||
      (filterMatch === "match" && i.model_matches && i.serial_matches) ||
      (filterMatch === "mismatch" && (!i.model_matches || !i.serial_matches))
    const matchStatus = !filterStatus ||
      (filterStatus === "none" && !i.engineer_status) ||
      i.engineer_status === filterStatus
    return matchSearch && matchFault && matchStore && matchMatch && matchStatus
  })

  const updateStatus = async (id: string, status: string, comment?: string) => {
    setSavingId(id)
    const supabase = createClient()
    await supabase.from("inspections").update({
      engineer_status: status,
      engineer_comment: comment ?? null,
    }).eq("id", id)

    setInspections(prev => prev.map(i =>
      i.id === id ? { ...i, engineer_status: status, engineer_comment: comment ?? null } : i
    ))
    setSavingId(null)
  }

  const handleStatusChange = (inspection: InspectionRow, newStatus: string) => {
    if (newStatus === "rejected") {
      setCommentModal({ id: inspection.id, preset: "", custom: "" })
    } else {
      updateStatus(inspection.id, newStatus)
    }
  }

  const handleCommentSave = async () => {
    if (!commentModal) return
    const finalComment = commentModal.preset === "Otro (ver comentario)"
      ? commentModal.custom
      : commentModal.preset || commentModal.custom
    await updateStatus(commentModal.id, "rejected", finalComment)
    setCommentModal(null)
  }

  const exportCSV = () => {
    const headers = [
      "Fecha", "Tecnico", "Tienda", "ID Interno Tienda", "Modelo Tienda", "Serie Tienda",
      "Modelo Verificado", "Serie Verificada", "Modelo Coincide", "Serie Coincide",
      "Clasificacion", "Detalle", "Estado Ingeniero", "Comentario Ingeniero"
    ]
    const rows = filtered.map(i => [
      new Date(i.created_at).toLocaleDateString("es-ES"),
      i.technician?.full_name ?? "",
      i.assigned_unit?.assignment?.store?.name ?? "",
      i.assigned_unit?.store_internal_id ?? "",
      i.assigned_unit?.store_model ?? "",
      i.assigned_unit?.store_serial ?? "",
      i.verified_model,
      i.verified_serial,
      i.model_matches ? "Si" : "No",
      i.serial_matches ? "Si" : "No",
      FAULT_LABELS[i.fault_category] || i.fault_category,
      i.fault_detail ?? "",
      i.engineer_status ?? "",
      i.engineer_comment ?? "",
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `revisiones_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const hasPhotos = (i: InspectionRow) => i.photo_model_url || i.photo_serial_url || i.photo_fault_url

  const getStatusStyle = (status: string | null) => {
    if (status === "accepted") return "bg-green-50 text-green-600 border-green-200"
    if (status === "rejected") return "bg-red-50 text-red-500 border-red-200"
    if (status === "verify") return "bg-amber-50 text-amber-600 border-amber-200"
    return "bg-gray-50 text-gray-400 border-gray-200"
  }

  const getStatusLabel = (status: string | null) => {
    if (status === "accepted") return "Aceptado"
    if (status === "rejected") return "Rechazado"
    if (status === "verify") return "Verificar"
    return "Sin clasificar"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-widest text-blue-600">HISENSE</div>
            <p className="text-xs text-gray-400 mt-0.5">Panel de ingeniero</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition">
              <Download size={15} /> Exportar CSV
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total revisiones", value: inspections.length, color: "text-gray-800" },
            { label: "Coincidencias OK", value: inspections.filter(i => i.model_matches && i.serial_matches).length, color: "text-green-600" },
            { label: "Discrepancias", value: inspections.filter(i => !i.model_matches || !i.serial_matches).length, color: "text-amber-500" },
            { label: "Sin averia (NFF)", value: inspections.filter(i => i.fault_category === "no_fault_found").length, color: "text-gray-800" },
            { label: "Pendientes clasificar", value: inspections.filter(i => !i.engineer_status).length, color: "text-purple-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterFault} onChange={(e) => setFilterFault(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Todos los fallos</option>
              {Object.entries(FAULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Todas las tiendas</option>
              {stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterMatch} onChange={(e) => setFilterMatch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Todas las coincidencias</option>
              <option value="match">Coinciden</option>
              <option value="mismatch">Discrepancia</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Todos los estados</option>
              <option value="none">Sin clasificar</option>
              <option value="accepted">Aceptado</option>
              <option value="rejected">Rechazado</option>
              <option value="verify">Verificar</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{filtered.length} revisiones</p>
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
                  <th className="px-4 py-3 text-left">ID Interno</th>
                  <th className="px-4 py-3 text-left">Coincide</th>
                  <th className="px-4 py-3 text-left">Fallo</th>
                  <th className="px-4 py-3 text-left">Fotos</th>
                  <th className="px-4 py-3 text-left">Clasificacion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(i.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{i.technician?.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{i.assigned_unit?.assignment?.store?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{i.verified_model}</div>
                      {!i.model_matches && <div className="text-xs text-amber-500">Ref: {i.assigned_unit?.store_model}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{i.verified_serial}</div>
                      {!i.serial_matches && <div className="text-xs text-amber-500">Ref: {i.assigned_unit?.store_serial}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {i.assigned_unit?.store_internal_id || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        i.model_matches && i.serial_matches ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-500"
                      }`}>
                        {i.model_matches && i.serial_matches ? "Si" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className={i.fault_category === "functional_fault" ? "text-purple-600 font-medium" : ""}>
                        {FAULT_LABELS[i.fault_category]}
                      </div>
                      {i.fault_detail && <div className="text-xs text-gray-400 truncate max-w-28">{i.fault_detail}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {hasPhotos(i) ? (
                        <button
                          onClick={() => { setSelectedInspection(i); setActivePhoto(i.photo_model_url || i.photo_serial_url || i.photo_fault_url) }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg transition">
                          <Camera size={12} /> Ver fotos
                        </button>
                      ) : <span className="text-xs text-gray-300">Sin fotos</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 min-w-32">
                        <div className="relative">
                          <select
                            value={i.engineer_status ?? ""}
                            onChange={(e) => handleStatusChange(i, e.target.value)}
                            disabled={savingId === i.id}
                            className={`w-full text-xs px-2 py-1.5 rounded-lg border appearance-none cursor-pointer pr-6 transition font-medium ${getStatusStyle(i.engineer_status)} ${savingId === i.id ? "opacity-50" : ""}`}
                          >
                            <option value="">Sin clasificar</option>
                            {STATUS_OPTIONS.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} className="absolute right-2 top-2 pointer-events-none text-current opacity-60" />
                        </div>
                        {i.engineer_status === "rejected" && i.engineer_comment && (
                          <p className="text-xs text-red-400 truncate max-w-32" title={i.engineer_comment}>
                            {i.engineer_comment}
                          </p>
                        )}
                        {i.engineer_status === "verify" && (
                          <p className="text-xs text-amber-500">Pendiente revision</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal fotos */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={() => { setSelectedInspection(null); setActivePhoto(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Fotos de la inspeccion</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedInspection.verified_model} · {selectedInspection.verified_serial}
                </p>
              </div>
              <button onClick={() => { setSelectedInspection(null); setActivePhoto(null) }}
                className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
            </div>
            <div className="p-6">
              {activePhoto && (
                <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                  <img src={activePhoto} alt="Foto ampliada" className="w-full object-contain max-h-96" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { url: selectedInspection.photo_model_url, label: "Modelo" },
                  { url: selectedInspection.photo_serial_url, label: "Numero de serie" },
                  { url: selectedInspection.photo_fault_url, label: "Fallo" },
                ].filter(p => p.url).map(p => (
                  <div key={p.label}
                    className={`cursor-pointer rounded-xl overflow-hidden border-2 transition ${activePhoto === p.url ? "border-blue-500" : "border-gray-100 hover:border-blue-300"}`}
                    onClick={() => setActivePhoto(p.url!)}>
                    <img src={p.url!} alt={p.label} className="w-full h-32 object-cover" />
                    <p className="text-xs text-center text-gray-500 py-1.5 bg-gray-50">{p.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-400">Tecnico</p>
                  <p className="text-sm text-gray-700 font-medium">{selectedInspection.technician?.full_name}</p></div>
                <div><p className="text-xs text-gray-400">Tienda</p>
                  <p className="text-sm text-gray-700 font-medium">{selectedInspection.assigned_unit?.assignment?.store?.name}</p></div>
                <div><p className="text-xs text-gray-400">Fallo</p>
                  <p className="text-sm text-gray-700 font-medium">{FAULT_LABELS[selectedInspection.fault_category]}</p></div>
                <div><p className="text-xs text-gray-400">Fecha</p>
                  <p className="text-sm text-gray-700 font-medium">{new Date(selectedInspection.created_at).toLocaleDateString("es-ES")}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal comentario rechazo */}
      {commentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Motivo del rechazo</h2>
            <div className="space-y-2">
              {REJECT_COMMENTS.map(c => (
                <button key={c} type="button"
                  onClick={() => setCommentModal({ ...commentModal, preset: c })}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition ${
                    commentModal.preset === c
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            {(commentModal.preset === "Otro (ver comentario)" || !commentModal.preset) && (
              <textarea
                placeholder="Escribe el motivo del rechazo..."
                value={commentModal.custom}
                onChange={(e) => setCommentModal({ ...commentModal, custom: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setCommentModal(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleCommentSave}
                disabled={!commentModal.preset && !commentModal.custom.trim()}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-40">
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
