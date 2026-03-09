import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/dashboard"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin

  const supabase = createClient()

  // Método 1: PKCE flow con código
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Si es una recuperación de contraseña, redirigir al formulario de reset
      if (type === "recovery") {
        return NextResponse.redirect(`${appUrl}/auth/reset-password`)
      }
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  // Método 2: Magic link / OTP con token_hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "signup" | "email",
      token_hash,
    })

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${appUrl}/auth/reset-password`)
      }
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  // Si hay error o no hay código/token, redirigir a login
  return NextResponse.redirect(`${appUrl}/login`)
}