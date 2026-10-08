export type CourseStatus = 'active' | 'archived'
export type EnrollmentStatus = 'active' | 'withdrawn' | 'completed'

export type Course = {
  id: string
  courseCode: string
  title: string
  description: string
  credits: number
  teacherIds: string[]
  status: CourseStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type CourseInput = {
  courseCode: string
  title: string
  description: string
  credits: number
  teacherIds: string[]
  status: CourseStatus
}

export type Enrollment = {
  id: string
  studentId: string
  courseId: string
  status: EnrollmentStatus
  enrolledAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type EnrollmentInput = {
  studentId: string
  courseId: string
  status: EnrollmentStatus
}
