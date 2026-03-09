import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/dashboard"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://inspecciones.hisense-iberia.com"

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "signup" | "email",
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${appUrl}/login`)
}