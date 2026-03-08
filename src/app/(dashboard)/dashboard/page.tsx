import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log("DASHBOARD USER:", user?.email)

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  if (profile.role === "admin") redirect("/admin")
  if (profile.role === "engineer") redirect("/engineer")
  redirect("/technician")
}