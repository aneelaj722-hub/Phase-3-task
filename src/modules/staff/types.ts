export type Role = 'administrator' | 'teacher' | 'finance'
export type StaffStatus = 'active' | 'inactive'

export type StaffProfile = {
  id: string
  email: string
  fullName: string
  role: Role
  status: StaffStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export type StaffProfileInput = {
  fullName: string
  email: string
  role: Role
}
