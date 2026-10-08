export type TeacherStatus = 'active' | 'inactive'

export type Teacher = {
  id: string
  teacherIdentifier: string
  fullName: string
  email: string
  phone: string
  specialization: string
  assignedCourses: string[]
  status: TeacherStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type TeacherInput = {
  teacherIdentifier: string
  fullName: string
  email: string
  phone: string
  specialization: string
  assignedCourses: string[]
  status: TeacherStatus
}
