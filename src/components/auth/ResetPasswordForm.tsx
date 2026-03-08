"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Las contrasenas no coinciden")
      return
    }
    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError("Error al actualizar la contrasena")
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="mb-8 text-center">
        <div className="text-4xl font-bold tracking-widest text-blue-600">HISENSE</div>
        <p className="text-sm text-gray-500 mt-1">Portal Tecnico</p>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Nueva contrasena</h1>
        <p className="text-sm text-gray-500 mb-6">Introduce tu nueva contrasena.</p>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nueva contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Minimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirmar contrasena</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Repite la contrasena"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar contrasena"}
          </button>
        </form>
      </div>
    </div>
  )
}