import { type EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard"

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.search = ""

  if (token_hash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error && data.session) {
      const response = NextResponse.redirect(redirectTo)
      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: data.session.expires_in,
      })
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      })
      return response
    }
  }

  redirectTo.pathname = "/login"
  return NextResponse.redirect(redirectTo)
}