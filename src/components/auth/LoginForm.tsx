"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("ERROR:", error)
    console.log("USER:", data?.user)
    console.log("SESSION:", data?.session)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log("Redirigiendo a /dashboard...")
    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="mb-8 text-center">
        <div className="text-4xl font-bold tracking-widest text-blue-600">HISENSE</div>
        <p className="text-sm text-gray-500 mt-1">Portal Tecnico</p>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesion</h1>
        <form onSubmit={handleLogin} className="space-y-4">
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
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Olvidaste tu contrasena?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Iniciando sesion..." : "Iniciar sesion"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          No tienes cuenta?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
