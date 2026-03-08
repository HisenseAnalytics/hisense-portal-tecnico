import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import InspectionForm from "@/components/technician/InspectionForm"

export default async function InspectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: unit } = await supabase
    .from("assigned_units")
    .select("*, assignment:assignments(*, store:stores(*))")
    .eq("id", params.id)
    .single()

  if (!unit) notFound()
  if (unit.status === "completed") redirect("/technician")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  return <InspectionForm unit={unit} profile={profile} />
}