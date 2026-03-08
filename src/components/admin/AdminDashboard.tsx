"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Profile, Store, Assignment, EditRequest } from "@/lib/types"
import { LogOut, Users, Store as StoreIcon, ClipboardList, Bell, Plus, Check, X } from "lucide-react"
import ExcelUploader from "@/components/admin/ExcelUploader"

interface Props {
  profile: Profile
  technicians: Profile[]
  stores: Store[]
  assignments: Assignment[]
  editRequests: EditRequest[]
}

type Tab = "assignments" | "technicians" | "stores" | "requests"

export default function AdminDashboard({ profile, technicians, stores, assignments, editRequests }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("assignments")
  const [loading, setLoading] = useState(false)

  // Assignment form state
  const [selectedTechnician, setSelectedTechnician] = useState("")
  const [selectedStore, setSelectedStore] = useState("")
  const [visitDate, setVisitDate] = useState("")
  const [units, setUnits] = useState([{ model: "", serial: "", reason: "" }])
  const [assignSuccess, setAssignSuccess] = useState("")
  const [assignError, setAssignError] = useState("")

  // Store form state
  const [storeName, setStoreName] = useState("")
  const [storeCity, setStoreCity] = useState("")
  const [storeCountry, setStoreCountry] = useState("ES")
  const [storeAddress, setStoreAddress] = useState("")
  const [storeSuccess, setStoreSuccess] = useState("")

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const addUnit = () => {
    setUnits([...units, { model: "", serial: "", reason: "" }])
  }

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index))
  }

  const updateUnit = (index: number, field: string, value: string) => {
    const updated = [...units]
    updated[index] = { ...updated[index], [field]: value }
    setUnits(updated)
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAssignError("")
    setAssignSuccess("")

    const supabase = createClient()

    const { data: assignment, error: assignErr } = await supabase
      .from("assignments")
      .insert({
        technician_id: selectedTechnician,
        store_id: selectedStore,
        visit_date: visitDate,
        status: "pending",
        created_by: profile.id,
      })
      .select()
      .single()

    if (assignErr || !assignment) {
      setAssignError("Error al crear la asignacion")
      setLoading(false)
      return
    }

    const unitsToInsert = units.map((u) => ({
      assignment_id: assignment.id,
      store_model: u.model,
      store_serial: u.serial,
      return_reason: u.reason,
      status: "pending",
    }))

    const { error: unitsError } = await supabase.from("assigned_units").insert(unitsToInsert)

    if (unitsError) {
      setAssignError("Error al crear los equipos")
      setLoading(false)
      return
    }

    setAssignSuccess("Revision asignada correctamente")
    setSelectedTechnician("")
    setSelectedStore("")
    setVisitDate("")
    setUnits([{ model: "", serial: "", reason: "" }])
    setLoading(false)
    router.refresh()
  }

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStoreSuccess("")

    const supabase = createClient()
    await supabase.from("stores").insert({
      name: storeName,
      city: storeCity,
      country: storeCountry,
      address: storeAddress,
      is_active: true,
    })

    setStoreSuccess("Tienda creada correctamente")
    setStoreName("")
    setStoreCity("")
    setStoreAddress("")
    setLoading(false)
    router.refresh()
  }

  const handleEditRequest = async (id: string, status: "approved" | "rejected") => {
    const supabase = createClient()

    if (status === "approved") {
      const request = editRequests.find((r) => r.id === id)
      if (request) {
        await supabase
          .from("inspections")
          .update({ is_editable: true })
          .eq("id", request.inspection_id)
      }
    }

    await supabase
      .from("edit_requests")
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq("id", id)

    router.refresh()
  }

  const tabs = [
    { id: "assignments", label: "Asignar", icon: ClipboardList },
    { id: "technicians", label: "Tecnicos", icon: Users },
    { id: "stores", label: "Tiendas", icon: StoreIcon },
    { id: "requests", label: "Solicitudes", icon: Bell, badge: editRequests.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-widest text-blue-600">HISENSE</div>
            <p className="text-xs text-gray-400 mt-0.5">Panel de administracion</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition relative ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.badge ? (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ASIGNAR REVISIONES */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Nueva asignacion</h2>
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tecnico</label>
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selecciona un tecnico</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name} - {t.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tienda</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selecciona una tienda</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de visita</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Equipos */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Equipos a revisar</h3>
                  <button
                    type="button"
                    onClick={addUnit}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={14} />
                    Anadir equipo
                  </button>
                </div>

                {/* Excel Uploader */}
                <div className="mb-4">
                  <ExcelUploader onUnitsLoaded={(excelUnits) => {
                    if (excelUnits.length > 0) setUnits(excelUnits)
                  }} />
                </div>

                <div className="space-y-4">
                  {units.map((unit, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Equipo {index + 1}</span>
                        {units.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUnit(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Modelo"
                        value={unit.model}
                        onChange={(e) => updateUnit(index, "model", e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Numero de serie"
                        value={unit.serial}
                        onChange={(e) => updateUnit(index, "serial", e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={unit.reason}
                        onChange={(e) => updateUnit(index, "reason", e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Motivo de devolucion</option>
                        <option value="Dano estetico">Dano estetico</option>
                        <option value="Golpe estructural">Golpe estructural</option>
                        <option value="Dano por agua / humedad">Dano por agua / humedad</option>
                        <option value="Mercancia usada">Mercancia usada</option>
                        <option value="Embalaje danado">Embalaje danado</option>
                        <option value="Producto incompleto">Producto incompleto</option>
                        <option value="Averia funcional">Averia funcional</option>
                        <option value="Sin averia aparente (NFF)">Sin averia aparente (NFF)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {assignError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{assignError}</p>
              )}
              {assignSuccess && (
                <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{assignSuccess}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Asignando..." : "Asignar revision"}
              </button>
            </form>

            {/* Historial asignaciones */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Ultimas asignaciones
              </h3>
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.store?.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.technician?.full_name} - {new Date(a.visit_date).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        a.status === "completed"
                          ? "bg-green-50 text-green-600"
                          : a.status === "pending"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-50 text-gray-500"
                      }`}>
                        {a.status === "completed" ? "Completada" : a.status === "pending" ? "Pendiente" : "Cancelada"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {a.assigned_units?.length || 0} equipos
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TECNICOS */}
        {activeTab === "technicians" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Tecnicos</h2>
            {technicians.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                <p className="text-gray-500 text-sm">No hay tecnicos registrados</p>
              </div>
            ) : (
              technicians.map((t) => (
                <div key={t.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.full_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.email}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const supabase = createClient()
                        await supabase
                          .from("profiles")
                          .update({ is_active: !t.is_active })
                          .eq("id", t.id)
                        router.refresh()
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                        t.is_active
                          ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500"
                          : "bg-red-50 text-red-500 hover:bg-green-50 hover:text-green-600"
                      }`}
                    >
                      {t.is_active ? "Activo" : "Inactivo"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TIENDAS */}
        {activeTab === "stores" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Anadir tienda</h2>
            <form onSubmit={handleAddStore} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  placeholder="El Corte Ingles"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={storeCity}
                  onChange={(e) => setStoreCity(e.target.value)}
                  required
                  placeholder="Madrid"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pais</label>
                <select
                  value={storeCountry}
                  onChange={(e) => setStoreCountry(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ES">Espana</option>
                  <option value="PT">Portugal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Direccion</label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Calle Serrano 47"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {storeSuccess && (
                <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{storeSuccess}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Anadir tienda"}
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Tiendas
              </h3>
              {stores.map((s) => (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.city} - {s.country}</p>
                      {s.address && <p className="text-xs text-gray-400">{s.address}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        const supabase = createClient()
                        await supabase
                          .from("stores")
                          .update({ is_active: !s.is_active })
                          .eq("id", s.id)
                        router.refresh()
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                        s.is_active
                          ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500"
                          : "bg-red-50 text-red-500 hover:bg-green-50 hover:text-green-600"
                      }`}
                    >
                      {s.is_active ? "Activa" : "Inactiva"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOLICITUDES DE EDICION */}
        {activeTab === "requests" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Solicitudes de modificacion</h2>
            {editRequests.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                <Check size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No hay solicitudes pendientes</p>
              </div>
            ) : (
              editRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-medium text-gray-800">
                    {req.technician?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditRequest(req.id, "approved")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition"
                    >
                      <Check size={12} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleEditRequest(req.id, "rejected")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                    >
                      <X size={12} />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
