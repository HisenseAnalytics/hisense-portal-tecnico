"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { CheckCircle, X, FileSpreadsheet } from "lucide-react"

interface Unit {
  model: string
  serial: string
  reason: string
  store_internal_id?: string
}

interface Props {
  onUnitsLoaded: (units: Unit[]) => void
}

export default function ExcelUploader({ onUnitsLoaded }: Props) {
  const [preview, setPreview] = useState<Unit[]>([])
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        const headerRow = rows[0]?.map((h: any) => String(h).toLowerCase().trim())
        if (!headerRow) {
          setError("El archivo esta vacio")
          return
        }

        const modelIdx = headerRow.findIndex((h: string) =>
          h.includes("model") || h.includes("modelo")
        )
        const serialIdx = headerRow.findIndex((h: string) =>
          h.includes("serial") || h.includes("serie") || h.includes("sn")
        )
        const reasonIdx = headerRow.findIndex((h: string) =>
          h.includes("motivo") || h.includes("reason") || h.includes("devolucion")
        )
        const internalIdIdx = headerRow.findIndex((h: string) =>
          h.includes("interno") || h.includes("identificacion") || h.includes("nro") || h.includes("id interno")
        )

        if (modelIdx === -1 || serialIdx === -1) {
          setError("El archivo debe tener columnas: Modelo, Serie/Serial, Motivo")
          return
        }

        const units: Unit[] = []
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || !row[modelIdx]) continue
          units.push({
            model: String(row[modelIdx] || "").trim(),
            serial: String(row[serialIdx] || "").trim(),
            reason: reasonIdx !== -1 ? String(row[reasonIdx] || "").trim() : "",
            store_internal_id: internalIdIdx !== -1 && row[internalIdIdx]
              ? String(row[internalIdIdx]).trim()
              : undefined,
          })
        }

        if (units.length === 0) {
          setError("No se encontraron equipos en el archivo")
          return
        }

        setPreview(units)
        onUnitsLoaded(units)
      } catch {
        setError("Error al leer el archivo. Asegurate de que sea un Excel valido.")
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleClear = () => {
    setPreview([])
    setFileName("")
    setError("")
    onUnitsLoaded([])
  }

  const downloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault()
    const ws = XLSX.utils.aoa_to_sheet([
      ["Modelo", "Serie", "Motivo", "Nro. Identificacion Interno Tienda"],
      ["HIS-55U7KQ", "SN123456789", "Averia funcional", "INT-001"],
      ["HIS-43A7KQ", "SN987654321", "Dano estetico", ""],
    ])
    // Set column widths
    ws["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 36 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Equipos")
    XLSX.writeFile(wb, "plantilla_equipos.xlsx")
  }

  const hasInternalIds = preview.some(u => u.store_internal_id)

  return (
    <div className="space-y-3">
      {preview.length === 0 ? (
        <div>
          <label className="flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
            <FileSpreadsheet size={24} className="text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Subir Excel</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Columnas: Modelo, Serie, Motivo, Nro. Identificacion Interno Tienda (opcional)
              </p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>
          <a
            href="#"
            onClick={downloadTemplate}
            className="block text-center text-xs text-blue-600 hover:underline mt-2"
          >
            Descargar plantilla Excel
          </a>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {preview.length} equipos cargados desde {fileName}
              </span>
              {hasInternalIds && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Con ID interno
                </span>
              )}
            </div>
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {preview.map((u, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">{u.model}</p>
                  <p className="text-xs text-gray-400">S/N: {u.serial}</p>
                  {u.store_internal_id && (
                    <p className="text-xs text-blue-500">ID interno: {u.store_internal_id}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">{u.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
          <X size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
