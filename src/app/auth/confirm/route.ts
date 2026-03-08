import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://inspecciones.hisense-iberia.com"

  const supabase = createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${appUrl}/auth/reset-password`)
      }
      return NextResponse.redirect(`${appUrl}/dashboard`)
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${appUrl}/auth/reset-password`)
      }
      return NextResponse.redirect(`${appUrl}/dashboard`)
    }
  }

  return NextResponse.redirect(`${appUrl}/login`)
}