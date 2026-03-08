"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Props {
  currentLanguage: string
}

export default function LanguageSelector({ currentLanguage }: Props) {
  const [language, setLanguage] = useState(currentLanguage)
  const router = useRouter()

  const handleChange = async (lang: string) => {
    setLanguage(lang)

    // Guardar en Supabase
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("profiles")
        .update({ language: lang })
        .eq("id", user.id)
    }

    // Guardar en cookie para que el servidor lo lea
    document.cookie = `language=${lang};path=/;max-age=31536000`

    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleChange("es")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
          language === "es"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        ES
      </button>
      <button
        onClick={() => handleChange("pt")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
          language === "pt"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        PT
      </button>
    </div>
  )
}