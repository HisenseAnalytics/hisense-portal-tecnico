import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import TechnicianDashboard from "@/components/technician/TechnicianDashboard"

export default async function TechnicianPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")
  if (profile.role !== "technician") redirect("/dashboard")

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*, store:stores(*), assigned_units(*)")
    .eq("technician_id", user.id)
    .eq("status", "pending")
    .order("visit_date", { ascending: true })

  return <TechnicianDashboard profile={profile} assignments={assignments || []} />
}
