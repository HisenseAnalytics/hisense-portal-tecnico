"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { Profile, Assignment } from "@/lib/types"
import { ClipboardList, CheckCircle, LogOut, ChevronRight } from "lucide-react"
import LanguageSelector from "@/components/ui/LanguageSelector"

interface Props {
  profile: Profile
  assignments: Assignment[]
}

export default function TechnicianDashboard({ profile, assignments }: Props) {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const pendingUnits = assignments.reduce((acc, a) => {
    return acc + (a.assigned_units?.filter((u) => u.status === "pending").length || 0)
  }, 0)

  const completedUnits = assignments.reduce((acc, a) => {
    return acc + (a.assigned_units?.filter((u) => u.status === "completed").length || 0)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-widest text-blue-600">HISENSE</div>
            <p className="text-xs text-gray-400 mt-0.5">Portal Tecnico</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector currentLanguage={profile.language} />
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut size={16} />
              {t("auth.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">
            {t("dashboard.hello")}, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString(profile.language === "pt" ? "pt-PT" : "es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-blue-600" />
              <span className="text-xs text-gray-500">{t("dashboard.pending")}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{pendingUnits}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-xs text-gray-500">{t("dashboard.completed")}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{completedUnits}</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t("dashboard.pending_reviews")}
          </h2>

          {assignments.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">{t("dashboard.no_pending")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const pending =
                  assignment.assigned_units?.filter((u) => u.status === "pending") || []
                return (
                  <div
                    key={assignment.id}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {assignment.store?.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {assignment.store?.city} -{" "}
                            {new Date(assignment.visit_date).toLocaleDateString(
                              profile.language === "pt" ? "pt-PT" : "es-ES"
                            )}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                          {pending.length} equipos
                        </span>
                      </div>
                    </div>
                    {pending.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => router.push(`/technician/inspect/${unit.id}`)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-700">{unit.store_model}</p>
                          <p className="text-xs text-gray-400 mt-0.5">S/N: {unit.store_serial}</p>
                          <p className="text-xs text-gray-400">{unit.return_reason}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
