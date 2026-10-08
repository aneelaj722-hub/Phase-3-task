export type StudentStatus = 'active' | 'inactive' | 'withdrawn'

export type Student = {
  id: string
  studentIdentifier: string
  fullName: string
  email: string
  phone: string
  enrollmentDate: string
  status: StudentStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type StudentInput = Omit<
  Student,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>
