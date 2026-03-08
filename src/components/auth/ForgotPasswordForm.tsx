"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) {
      setError("Error al enviar el correo. Intentalo de nuevo.")
      setLoading(false)
      return
    }

    setSuccess("Te hemos enviado un enlace para recuperar tu contrasena.")
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="mb-8 text-center">
        <div className="text-4xl font-bold tracking-widest text-blue-600">HISENSE</div>
        <p className="text-sm text-gray-500 mt-1">Portal Tecnico</p>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Recuperar contrasena</h1>
        <p className="text-sm text-gray-500 mb-6">
          Introduce tu correo y te enviaremos un enlace para recuperar tu contrasena.
        </p>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Correo electronico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="nombre@email.com"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>
          )}
          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Volver al inicio de sesion
          </Link>
        </p>
      </div>
    </div>
  )
}
