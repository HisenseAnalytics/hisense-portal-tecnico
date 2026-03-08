import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://inspecciones.hisense-iberia.com"

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(`${appUrl}${next}`)
  }

  return NextResponse.redirect(`${appUrl}/login`)
}