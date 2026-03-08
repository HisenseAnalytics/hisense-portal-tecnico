import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import EngineerDashboard from "@/components/engineer/EngineerDashboard"

export default async function EngineerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")
  if (profile.role !== "engineer") redirect("/dashboard")

  const { data: inspections } = await supabase
    .from("inspections")
    .select(`
      *,
      technician:profiles(*),
      assigned_unit:assigned_units(
        *,
        assignment:assignments(
          *,
          store:stores(*)
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  return <EngineerDashboard profile={profile} inspections={inspections || []} />
}