import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminDashboard from "@/components/admin/AdminDashboard"

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")
  if (profile.role !== "admin") redirect("/dashboard")

  const { data: technicians } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "technician")
    .eq("is_active", true)
    .order("full_name")

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .order("name")

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*, store:stores(*), technician:profiles(*), assigned_units(*)")
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: editRequests } = await supabase
    .from("edit_requests")
    .select("*, inspection:inspections(*), technician:profiles(*)")
    .eq("status", "pending")

  return (
    <AdminDashboard
      profile={profile}
      technicians={technicians || []}
      stores={stores || []}
      assignments={assignments || []}
      editRequests={editRequests || []}
    />
  )
}
