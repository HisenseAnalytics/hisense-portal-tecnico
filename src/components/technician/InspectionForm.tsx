"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Profile, AssignedUnit, FUNCTIONAL_FAULTS, FaultCategory } from "@/lib/types"
import { ArrowLeft, Camera, CheckCircle, AlertTriangle } from "lucide-react"

interface Props {
  unit: AssignedUnit & {
    assignment_id: string
    assignment: {
      store: { name: string; city: string }
      visit_date: string
    }
  }
  profile: Profile
}

const FAULT_CATEGORIES = [
  { value: "aesthetic_damage", label: "Dano estetico" },
  { value: "structural_impact", label: "Golpe estructural" },
  { value: "water_damage", label: "Dano por agua / humedad" },
  { value: "used_merchandise", label: "Mercancia usada" },
  { value: "damaged_packaging", label: "Embalaje danado" },
  { value: "incomplete_product", label: "Producto incompleto" },
  { value: "no_power", label: "No enciende" },
  { value: "electrical_fault", label: "Averia electrica" },
  { value: "mechanical_fault", label: "Averia mecanica" },
  { value: "software_fault", label: "Fallo de software / pantalla" },
  { value: "abnormal_noise", label: "Ruido anormal" },
  { value: "gas_leak", label: "Perdida de gas" },
  { value: "no_fault_found", label: "Sin averia aparente (NFF)" },
]

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

export default function InspectionForm({ unit, profile }: Props) {
  const router = useRouter()
  const [verifiedModel, setVerifiedModel] = useState("")
  const [verifiedSerial, setVerifiedSerial] = useState("")
  const [faultCategory, setFaultCategory] = useState<FaultCategory | "">("")
  const [faultDetail, setFaultDetail] = useState("")
  const [photoSerial, setPhotoSerial] = useState<File | null>(null)
  const [photoModel, setPhotoModel] = useState<File | null>(null)
  const [photoFault, setPhotoFault] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const modelMatches = verifiedModel.trim().toLowerCase() === unit.store_model.trim().toLowerCase()
  const serialMatches = verifiedSerial.trim().toLowerCase() === unit.store_serial.trim().toLowerCase()
  const isFunctionalFault = faultCategory && FUNCTIONAL_FAULTS.includes(faultCategory as FaultCategory)

  const uploadPhoto = async (file: File, path: string): Promise<string | null> => {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from("inspection-photos")
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from("inspection-photos").getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!faultCategory) {
      setError("Selecciona una clasificacion del fallo")
      return
    }
    if (isFunctionalFault && !faultDetail) {
      setError("Describe el detalle de la averia")
      return
    }

    setLoading(true)
    setError("")

    const supabase = createClient()
    const timestamp = Date.now()

    let photoSerialUrl = null
    let photoModelUrl = null
    let photoFaultUrl = null

    if (photoSerial) {
      photoSerialUrl = await uploadPhoto(photoSerial, `${profile.id}/${timestamp}-serial.jpg`)
    }
    if (photoModel) {
      photoModelUrl = await uploadPhoto(photoModel, `${profile.id}/${timestamp}-model.jpg`)
    }
    if (photoFault) {
      photoFaultUrl = await uploadPhoto(photoFault, `${profile.id}/${timestamp}-fault.jpg`)
    }

    const { error: inspError } = await supabase.from("inspections").insert({
      assigned_unit_id: unit.id,
      technician_id: profile.id,
      verified_model: verifiedModel,
      verified_serial: verifiedSerial,
      model_matches: modelMatches,
      serial_matches: serialMatches,
      fault_category: faultCategory,
      fault_detail: faultDetail || null,
      photo_serial_url: photoSerialUrl,
      photo_model_url: photoModelUrl,
      photo_fault_url: photoFaultUrl,
    })

    if (inspError) {
      setError("Error al guardar la revision: " + inspError.message)
      setLoading(false)
      return
    }

    // Marcar equipo como completado
    await supabase
      .from("assigned_units")
      .update({ status: "completed" })
      .eq("id", unit.id)

    // Verificar si todos los equipos de la asignacion estan completados
    const { data: allUnits } = await supabase
      .from("assigned_units")
      .select("id, status")
      .eq("assignment_id", unit.assignment_id)

    const allCompleted = allUnits?.every((u) =>
      u.status === "completed" || u.id === unit.id
    )

    if (allCompleted) {
      await supabase
        .from("assignments")
        .update({ status: "completed" })
        .eq("id", unit.assignment_id)
    }

    // Enviar correo de confirmacion
    await fetch("/api/send-inspection-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technicianEmail: profile.email,
        technicianName: profile.full_name,
        storeName: unit.assignment.store.name,
        storeCity: unit.assignment.store.city,
        units: [{
          verified_model: verifiedModel,
          verified_serial: verifiedSerial,
          fault_label: FAULT_LABELS[faultCategory] || faultCategory,
          matches: modelMatches && serialMatches,
        }],
      }),
    })

    router.push("/technician")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-lg font-bold tracking-widest text-blue-600">HISENSE</div>
            <p className="text-xs text-gray-400">Formulario de revision</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">

        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <p className="text-sm font-medium text-blue-800">{unit.assignment.store.name}</p>
          <p className="text-xs text-blue-600 mt-0.5">
            {unit.assignment.store.city} - {new Date(unit.assignment.visit_date).toLocaleDateString("es-ES")}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Motivo: {unit.return_reason}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Referencia de la tienda</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Modelo</p>
                <p className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {unit.store_model}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">N serie</p>
                <p className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {unit.store_serial}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Verificacion del tecnico</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Modelo verificado</label>
                <input
                  type="text"
                  value={verifiedModel}
                  onChange={(e) => setVerifiedModel(e.target.value)}
                  required
                  placeholder="Escribe el modelo del equipo"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {verifiedModel && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${modelMatches ? "text-green-600" : "text-amber-500"}`}>
                    {modelMatches ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {modelMatches ? "Coincide con la referencia" : "No coincide con la referencia"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Numero de serie verificado</label>
                <input
                  type="text"
                  value={verifiedSerial}
                  onChange={(e) => setVerifiedSerial(e.target.value)}
                  required
                  placeholder="Escribe el numero de serie"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {verifiedSerial && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${serialMatches ? "text-green-600" : "text-amber-500"}`}>
                    {serialMatches ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {serialMatches ? "Coincide con la referencia" : "No coincide con la referencia"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Clasificacion del fallo</h2>
            <select
              value={faultCategory}
              onChange={(e) => setFaultCategory(e.target.value as FaultCategory)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
            >
              <option value="">Selecciona una clasificacion</option>
              {FAULT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {isFunctionalFault && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Detalle de la averia</label>
                <textarea
                  value={faultDetail}
                  onChange={(e) => setFaultDetail(e.target.value)}
                  required
                  rows={3}
                  placeholder="Describe la averia con detalle..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Fotos</h2>
            <div className="space-y-3">
              {[
                { label: "Foto numero de serie", state: photoSerial, setter: setPhotoSerial },
                { label: "Foto modelo", state: photoModel, setter: setPhotoModel },
                { label: "Foto del fallo", state: photoFault, setter: setPhotoFault },
              ].map(({ label, state, setter }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-blue-400 transition">
                    <Camera size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {state ? state.name : "Tomar o subir foto"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => setter(e.target.files?.[0] || null)}
                    />
                  </label>
                  {state && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> Foto seleccionada
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enviando revision..." : "Enviar revision"}
          </button>
        </form>
      </main>
    </div>
  )
}
