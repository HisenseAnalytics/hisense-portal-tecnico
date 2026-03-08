export type Role = "admin" | "technician" | "engineer"
export type Language = "es" | "pt"
export type Country = "ES" | "PT"
export type AssignmentStatus = "pending" | "completed" | "cancelled"
export type UnitStatus = "pending" | "completed"
export type EditRequestStatus = "pending" | "approved" | "rejected"

export type FaultCategory =
  | "aesthetic_damage"
  | "structural_impact"
  | "water_damage"
  | "used_merchandise"
  | "damaged_packaging"
  | "incomplete_product"
  | "no_power"
  | "electrical_fault"
  | "mechanical_fault"
  | "software_fault"
  | "abnormal_noise"
  | "gas_leak"
  | "no_fault_found"

export const FUNCTIONAL_FAULTS: FaultCategory[] = [
  "no_power",
  "electrical_fault",
  "mechanical_fault",
  "software_fault",
  "abnormal_noise",
  "gas_leak",
]

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  language: Language
  is_active: boolean
  created_at: string
}

export interface Store {
  id: string
  name: string
  city: string
  country: Country
  address: string | null
  is_active: boolean
  created_at: string
}

export interface Assignment {
  id: string
  technician_id: string
  store_id: string
  visit_date: string
  status: AssignmentStatus
  created_by: string
  created_at: string
  store?: Store
  technician?: Profile
  assigned_units?: AssignedUnit[]
}

export interface AssignedUnit {
  id: string
  assignment_id: string
  store_model: string
  store_serial: string
  return_reason: string
  status: UnitStatus
  created_at: string
  inspection?: Inspection
}

export interface Inspection {
  id: string
  assigned_unit_id: string
  technician_id: string
  visit_datetime: string
  verified_model: string
  verified_serial: string
  model_matches: boolean
  serial_matches: boolean
  fault_category: FaultCategory
  fault_detail: string | null
  photo_serial_url: string | null
  photo_model_url: string | null
  photo_fault_url: string | null
  is_editable: boolean
  created_at: string
  assigned_unit?: AssignedUnit
  technician?: Profile
}

export interface EditRequest {
  id: string
  inspection_id: string
  technician_id: string
  reason: string
  status: EditRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  inspection?: Inspection
  technician?: Profile
}
