export type AttendanceStatus = 'present' | 'absent' | 'late'

export type AttendanceSession = {
  id: string
  courseId: string
  sessionDate: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type AttendanceEntry = {
  id: string
  sessionId: string
  studentId: string
  status: AttendanceStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
