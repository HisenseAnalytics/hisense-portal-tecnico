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

  const [
    { data: technicians },
    { data: stores },
    { data: assignments },
    { data: editRequests },
    { data: reviewsRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "technician").order("full_name"),
    supabase.from("stores").select("*").order("name"),
    supabase.from("assignments").select(`
      *,
      technician:profiles(*),
      store:stores(*),
      assigned_units(*)
    `).order("created_at", { ascending: false }),
    supabase.from("edit_requests").select(`
      *,
      technician:profiles(full_name)
    `).eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("assigned_units").select(`
      id,
      store_model,
      store_serial,
      store_internal_id,
      status,
      assignment:assignments(
        visit_date,
        technician:profiles(full_name),
        store:stores(name)
      ),
      inspection:inspections(
        id,
        fault_category,
        engineer_status
      )
    `).order("created_at", { ascending: false }),
  ])

  // Flatten reviews for the admin view
  const reviews = (reviewsRaw || []).map((u: any) => ({
    id: u.id,
    technician_name: u.assignment?.technician?.full_name ?? "—",
    store_name: u.assignment?.store?.name ?? "—",
    visit_date: u.assignment?.visit_date ?? "",
    model: u.store_model,
    serial: u.store_serial,
    store_internal_id: u.store_internal_id ?? null,
    unit_status: u.status,
    inspection_id: u.inspection?.[0]?.id ?? null,
    fault_category: u.inspection?.[0]?.fault_category ?? null,
    engineer_status: u.inspection?.[0]?.engineer_status ?? null,
  }))

  return (
    <AdminDashboard
      profile={profile}
      technicians={technicians || []}
      stores={stores || []}
      assignments={assignments || []}
      editRequests={editRequests || []}
      reviews={reviews}
    />
  )
}
