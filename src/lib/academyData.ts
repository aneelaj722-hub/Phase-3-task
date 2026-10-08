import { supabase } from './supabase'
import type { Role, StaffProfile } from '../modules/staff/types'
import type { Student, StudentStatus } from '../modules/students/types'
import type { Teacher, TeacherStatus } from '../modules/teachers/types'
import type { Course, CourseStatus, Enrollment, EnrollmentStatus } from '../modules/courses/types'
import type { AttendanceEntry, AttendanceSession, AttendanceStatus } from '../modules/attendance/types'
import type {
  FeeObligation,
  FeeObligationStatus,
  FeePayment,
  FeePaymentStatus,
  PaymentMethod,
} from '../modules/fees/types'

type Row = Record<string, unknown>

export type AcademySnapshot = {
  staffProfiles: StaffProfile[]
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  attendanceSessions: AttendanceSession[]
  attendanceEntries: AttendanceEntry[]
  feeObligations: FeeObligation[]
  feePayments: FeePayment[]
}

function client() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env file, then restart Vite.')
  }
  return supabase
}

function rows(data: unknown, name: string): Row[] {
  if (!Array.isArray(data)) {
    throw new Error(`Supabase returned an invalid ${name} response.`)
  }
  return data as Row[]
}

function requiredString(row: Row, key: string, table: string): string {
  const value = row[key]
  if (typeof value !== 'string') {
    throw new Error(`Supabase returned an invalid ${table}.${key} value.`)
  }
  return value
}

function optionalString(row: Row, key: string): string {
  const value = row[key]
  return typeof value === 'string' ? value : ''
}

function numberValue(row: Row, key: string): number {
  const value = Number(row[key])
  if (!Number.isFinite(value)) {
    throw new Error(`Supabase returned an invalid numeric ${key} value.`)
  }
  return value
}

function profileFromRow(row: Row): StaffProfile {
  return {
    id: requiredString(row, 'user_id', 'staff_profiles'),
    email: requiredString(row, 'email', 'staff_profiles'),
    fullName: requiredString(row, 'full_name', 'staff_profiles'),
    role: parseRole(requiredString(row, 'role', 'staff_profiles')),
    status: row.is_active === true ? 'active' : 'inactive',
    createdAt: requiredString(row, 'created_at', 'staff_profiles'),
    updatedAt: requiredString(row, 'updated_at', 'staff_profiles'),
    createdBy: optionalString(row, 'created_by'),
    updatedBy: optionalString(row, 'updated_by'),
  }
}

function parseRole(value: string): Role {
  if (value === 'administrator' || value === 'teacher' || value === 'finance') return value
  throw new Error('Supabase returned an invalid staff role.')
}

export async function loadStaffProfile(userId: string): Promise<StaffProfile | null> {
  const { data, error } = await client()
    .from('staff_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Unable to load your staff profile: ${error.message}`)
  return data ? profileFromRow(data as Row) : null
}

function studentFromRow(row: Row): Student {
  return {
    id: requiredString(row, 'id', 'students'),
    studentIdentifier: requiredString(row, 'student_number', 'students'),
    fullName: requiredString(row, 'full_name', 'students'),
    email: optionalString(row, 'email'),
    phone: optionalString(row, 'phone'),
    enrollmentDate: requiredString(row, 'enrolled_on', 'students'),
    status: requiredString(row, 'status', 'students') as StudentStatus,
    createdAt: requiredString(row, 'created_at', 'students'),
    updatedAt: requiredString(row, 'updated_at', 'students'),
    createdBy: optionalString(row, 'created_by'),
    updatedBy: optionalString(row, 'updated_by'),
  }
}

function teacherFromRow(row: Row, assignedCourses: string[]): Teacher {
  return {
    id: requiredString(row, 'id', 'teachers'),
    teacherIdentifier: requiredString(row, 'teacher_number', 'teachers'),
    fullName: requiredString(row, 'full_name', 'teachers'),
    email: optionalString(row, 'email'),
    phone: optionalString(row, 'phone'),
    specialization: optionalString(row, 'specialization'),
    assignedCourses,
    status: requiredString(row, 'status', 'teachers') as TeacherStatus,
    createdAt: requiredString(row, 'created_at', 'teachers'),
    updatedAt: requiredString(row, 'updated_at', 'teachers'),
    createdBy: optionalString(row, 'created_by'),
    updatedBy: optionalString(row, 'updated_by'),
  }
}

function courseFromRow(row: Row, teacherIds: string[]): Course {
  return {
    id: requiredString(row, 'id', 'courses'),
    courseCode: requiredString(row, 'course_code', 'courses'),
    title: requiredString(row, 'name', 'courses'),
    description: optionalString(row, 'description'),
    credits: numberValue(row, 'credits'),
    teacherIds,
    status: requiredString(row, 'status', 'courses') as CourseStatus,
    createdAt: requiredString(row, 'created_at', 'courses'),
    updatedAt: requiredString(row, 'updated_at', 'courses'),
    createdBy: optionalString(row, 'created_by'),
    updatedBy: optionalString(row, 'updated_by'),
  }
}

function dateOnly(value: string): string {
  return value.slice(0, 10)
}

function isoDateTime(value: string): string {
  return `${dateOnly(value)}T00:00:00.000Z`
}

export async function loadAcademySnapshot(
  profile: StaffProfile,
): Promise<AcademySnapshot> {
  const api = client()
  const role = profile.role

  const [profilesResult, studentsResult, teachersResult, coursesResult, assignmentsResult, enrollmentsResult] =
    await Promise.all([
      role === 'administrator'
        ? api.from('staff_profiles').select('*').order('full_name')
        : api.from('staff_profiles').select('*').eq('user_id', profile.id),
      api.from('students').select('*').order('full_name'),
      role === 'administrator' || role === 'teacher'
        ? api.from('teachers').select('*').order('full_name')
        : Promise.resolve({ data: [], error: null }),
      api.from('courses').select('*').order('name'),
      role === 'administrator' || role === 'teacher'
        ? api.from('course_teachers').select('*')
        : Promise.resolve({ data: [], error: null }),
      api.from('enrollments').select('*').order('enrolled_on', { ascending: false }),
    ])

  for (const [result, label] of [
    [profilesResult, 'staff profiles'],
    [studentsResult, 'students'],
    [teachersResult, 'teachers'],
    [coursesResult, 'courses'],
    [assignmentsResult, 'course assignments'],
    [enrollmentsResult, 'enrollments'],
  ] as const) {
    if (result.error) {
      throw new Error(`Unable to load ${label}: ${result.error.message}`)
    }
  }

  const profileRows = rows(profilesResult.data, 'staff profiles')
  const studentRows = rows(studentsResult.data, 'students')
  const teacherRows = rows(teachersResult.data, 'teachers')
  const courseRows = rows(coursesResult.data, 'courses')
  const assignmentRows = rows(assignmentsResult.data, 'course assignments')
  const enrollmentRows = rows(enrollmentsResult.data, 'enrollments')

  const teacherIdsByCourse = new Map<string, string[]>()
  const courseIdsByTeacher = new Map<string, string[]>()
  for (const assignment of assignmentRows) {
    if (assignment.is_active !== true) continue
    const courseId = requiredString(assignment, 'course_id', 'course_teachers')
    const teacherId = requiredString(assignment, 'teacher_id', 'course_teachers')
    teacherIdsByCourse.set(courseId, [...(teacherIdsByCourse.get(courseId) ?? []), teacherId])
    courseIdsByTeacher.set(teacherId, [...(courseIdsByTeacher.get(teacherId) ?? []), courseId])
  }

  const courses = courseRows.map((row) =>
    courseFromRow(row, teacherIdsByCourse.get(requiredString(row, 'id', 'courses')) ?? []),
  )
  const courseById = new Map(courses.map((course) => [course.id, course]))
  const teachers = teacherRows.map((row) => {
    const id = requiredString(row, 'id', 'teachers')
    const assignedCourseNames = (courseIdsByTeacher.get(id) ?? [])
      .map((courseId) => courseById.get(courseId)?.courseCode)
      .filter((courseCode): courseCode is string => Boolean(courseCode))
    return teacherFromRow(row, assignedCourseNames)
  })

  const enrollments: Enrollment[] = enrollmentRows.map((row) => ({
    id: requiredString(row, 'id', 'enrollments'),
    studentId: requiredString(row, 'student_id', 'enrollments'),
    courseId: requiredString(row, 'course_id', 'enrollments'),
    status: requiredString(row, 'status', 'enrollments') as EnrollmentStatus,
    enrolledAt: isoDateTime(requiredString(row, 'enrolled_on', 'enrollments')),
    updatedAt: requiredString(row, 'updated_at', 'enrollments'),
    createdBy: optionalString(row, 'created_by'),
    updatedBy: optionalString(row, 'updated_by'),
  }))

  let attendanceSessions: AttendanceSession[] = []
  let attendanceEntries: AttendanceEntry[] = []
  if (role === 'administrator' || role === 'teacher') {
    const [sessionsResult, entriesResult] = await Promise.all([
      api.from('attendance_sessions').select('*').order('starts_at', { ascending: false }),
      api.from('attendance_entries').select('*'),
    ])
    if (sessionsResult.error) throw new Error(`Unable to load attendance sessions: ${sessionsResult.error.message}`)
    if (entriesResult.error) throw new Error(`Unable to load attendance entries: ${entriesResult.error.message}`)

    const sessionRows = rows(sessionsResult.data, 'attendance sessions')
    const entryRows = rows(entriesResult.data, 'attendance entries')
    attendanceSessions = sessionRows.map((row) => {
      const sessionDate = dateOnly(requiredString(row, 'starts_at', 'attendance_sessions'))
      const courseId = requiredString(row, 'course_id', 'attendance_sessions')
      const id = requiredString(row, 'id', 'attendance_sessions')
      return {
        id,
        courseId,
        sessionDate,
        createdAt: requiredString(row, 'created_at', 'attendance_sessions'),
        updatedAt: requiredString(row, 'updated_at', 'attendance_sessions'),
        createdBy: optionalString(row, 'created_by'),
        updatedBy: optionalString(row, 'updated_by'),
      }
    })
    const enrollmentById = new Map(enrollments.map((entry) => [entry.id, entry]))
    attendanceEntries = entryRows.flatMap((row) => {
      const enrollment = enrollmentById.get(requiredString(row, 'enrollment_id', 'attendance_entries'))
      if (!enrollment) return []
      return [{
        id: requiredString(row, 'id', 'attendance_entries'),
        sessionId: requiredString(row, 'session_id', 'attendance_entries'),
        studentId: enrollment.studentId,
        status: requiredString(row, 'status', 'attendance_entries') as AttendanceStatus,
        createdAt: requiredString(row, 'created_at', 'attendance_entries'),
        updatedAt: requiredString(row, 'updated_at', 'attendance_entries'),
        createdBy: optionalString(row, 'created_by'),
        updatedBy: optionalString(row, 'updated_by'),
      }]
    })
  }

  let feeObligations: FeeObligation[] = []
  let feePayments: FeePayment[] = []
  if (role === 'administrator' || role === 'finance') {
    const [obligationsResult, paymentsResult, allocationsResult] = await Promise.all([
      api.from('fee_obligations').select('*').order('due_on', { ascending: true }),
      api.from('payments').select('*').order('paid_on', { ascending: false }),
      api.from('payment_allocations').select('*'),
    ])
    if (obligationsResult.error) throw new Error(`Unable to load fee obligations: ${obligationsResult.error.message}`)
    if (paymentsResult.error) throw new Error(`Unable to load payments: ${paymentsResult.error.message}`)
    if (allocationsResult.error) throw new Error(`Unable to load payment allocations: ${allocationsResult.error.message}`)

    const obligationRows = rows(obligationsResult.data, 'fee obligations')
    const paymentRows = rows(paymentsResult.data, 'payments')
    const allocationRows = rows(allocationsResult.data, 'payment allocations')
    const paidByObligation = new Map<string, number>()
    const paymentIdsByObligation = new Map<string, string[]>()
    const paymentById = new Map(paymentRows.map((row) => [
      requiredString(row, 'id', 'payments'),
      row,
    ]))
    for (const allocation of allocationRows) {
      const paymentId = requiredString(allocation, 'payment_id', 'payment_allocations')
      const payment = paymentById.get(paymentId)
      if (!payment || payment.status !== 'posted') continue
      const obligationId = requiredString(allocation, 'fee_obligation_id', 'payment_allocations')
      paidByObligation.set(
        obligationId,
        (paidByObligation.get(obligationId) ?? 0) + numberValue(allocation, 'amount'),
      )
      paymentIdsByObligation.set(obligationId, [
        ...(paymentIdsByObligation.get(obligationId) ?? []),
        paymentId,
      ])
    }
    feeObligations = obligationRows.map((row) => {
      const id = requiredString(row, 'id', 'fee_obligations')
      const amount = numberValue(row, 'amount')
      const dbStatus = requiredString(row, 'status', 'fee_obligations')
      const balance = amount - (paidByObligation.get(id) ?? 0)
      const status: FeeObligationStatus = dbStatus === 'void'
        ? 'cancelled'
        : balance <= 0
          ? 'paid'
          : 'open'
      return {
        id,
        studentId: requiredString(row, 'student_id', 'fee_obligations'),
        enrollmentId: optionalString(row, 'enrollment_id') || undefined,
        description: requiredString(row, 'description', 'fee_obligations'),
        amount,
        remainingBalance: status === 'cancelled' ? 0 : Math.max(balance, 0),
        dueDate: optionalString(row, 'due_on'),
        status,
        createdAt: requiredString(row, 'created_at', 'fee_obligations'),
        updatedAt: requiredString(row, 'updated_at', 'fee_obligations'),
        createdBy: optionalString(row, 'created_by'),
        updatedBy: optionalString(row, 'updated_by'),
      }
    })
    const obligationIdByPayment = new Map<string, string>()
    for (const [obligationId, paymentIds] of paymentIdsByObligation) {
      for (const paymentId of paymentIds) {
        if (!obligationIdByPayment.has(paymentId)) obligationIdByPayment.set(paymentId, obligationId)
      }
    }
    feePayments = paymentRows.map((row) => ({
      id: requiredString(row, 'id', 'payments'),
      studentId: requiredString(row, 'student_id', 'payments'),
      obligationId: obligationIdByPayment.get(requiredString(row, 'id', 'payments')),
      amount: numberValue(row, 'amount'),
      paymentDate: requiredString(row, 'paid_on', 'payments'),
      method: requiredString(row, 'method', 'payments') as PaymentMethod,
      reference: optionalString(row, 'reference'),
      notes: optionalString(row, 'note'),
      status: requiredString(row, 'status', 'payments') as FeePaymentStatus,
      reviewRequired: false,
      createdAt: requiredString(row, 'created_at', 'payments'),
      updatedAt: optionalString(row, 'reversed_at') || requiredString(row, 'created_at', 'payments'),
      createdBy: optionalString(row, 'created_by'),
      updatedBy: optionalString(row, 'reversed_by') || optionalString(row, 'created_by'),
      reversedAt: optionalString(row, 'reversed_at') || undefined,
      reversedBy: optionalString(row, 'reversed_by') || undefined,
    }))
  }

  return {
    staffProfiles: profileRows.map(profileFromRow),
    students: studentRows.map(studentFromRow),
    teachers,
    courses,
    enrollments,
    attendanceSessions,
    attendanceEntries,
    feeObligations,
    feePayments,
  }
}

export async function setStudentStatusInDatabase(id: string, status: StudentStatus) {
  const { error } = await client().from('students').update({ status }).eq('id', id)
  if (error) throw new Error(`Unable to update student status: ${error.message}`)
}

export async function setTeacherStatusInDatabase(id: string, status: TeacherStatus) {
  const { error } = await client().from('teachers').update({ status }).eq('id', id)
  if (error) throw new Error(`Unable to update teacher status: ${error.message}`)
}

export async function setCourseStatusInDatabase(id: string, status: CourseStatus) {
  const { error } = await client().from('courses').update({ status }).eq('id', id)
  if (error) throw new Error(`Unable to update course status: ${error.message}`)
}

export async function setEnrollmentStatusInDatabase(id: string, status: EnrollmentStatus) {
  const { error } = await client().from('enrollments').update({
    status,
    ended_on: status === 'active' ? null : new Date().toISOString().slice(0, 10),
  }).eq('id', id)
  if (error) throw new Error(`Unable to update enrollment status: ${error.message}`)
}
