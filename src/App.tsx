import {
  type FormEvent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  loadAcademySnapshot,
  loadStaffProfile,
  setCourseStatusInDatabase,
  setEnrollmentStatusInDatabase,
  setStudentStatusInDatabase,
  setTeacherStatusInDatabase,
} from './lib/academyData'
import StaffManagementPage from './modules/staff/StaffManagementPage'
import type { Role, StaffProfile, StaffProfileInput, StaffStatus } from './modules/staff/types'
import StudentDetailPage from './modules/students/StudentDetailPage'
import StudentManagementPage from './modules/students/StudentManagementPage'
import type { Student, StudentInput, StudentStatus } from './modules/students/types'
import CourseDetailPage from './modules/courses/CourseDetailPage'
import CourseManagementPage from './modules/courses/CourseManagementPage'
import type { Course, CourseInput, CourseStatus, Enrollment, EnrollmentInput, EnrollmentStatus } from './modules/courses/types'
import TeacherDetailPage from './modules/teachers/TeacherDetailPage'
import TeacherManagementPage from './modules/teachers/TeacherManagementPage'
import type { Teacher, TeacherInput, TeacherStatus } from './modules/teachers/types'
import AttendanceManagementPage from './modules/attendance/AttendanceManagementPage'
import type { AttendanceEntry, AttendanceSession, AttendanceStatus } from './modules/attendance/types'
import FeesManagementPage from './modules/fees/FeesManagementPage'
import type { FeeObligation, FeeObligationInput, FeePayment, FeePaymentInput } from './modules/fees/types'

type SessionUser = {
  id: string
  email: string
  authenticatedAt: string
}

type AuthContextValue = {
  session: SessionUser | null
  profile: StaffProfile | null
  staffProfiles: StaffProfile[]
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  studentDataError: string
  teacherDataError: string
  courseDataError: string
  authError: string
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createProfile: (payload: StaffProfileInput) => Promise<void>
  createStaffProfile: (payload: StaffProfileInput) => Promise<void>
  updateStaffProfile: (id: string, payload: StaffProfileInput) => Promise<void>
  setStaffStatus: (id: string, status: StaffStatus) => Promise<void>
  createStudent: (input: StudentInput) => Promise<void>
  updateStudent: (id: string, input: StudentInput) => Promise<void>
  setStudentStatus: (id: string, status: StudentStatus) => Promise<void>
  createTeacher: (input: TeacherInput) => Promise<void>
  updateTeacher: (id: string, input: TeacherInput) => Promise<void>
  setTeacherStatus: (id: string, status: TeacherStatus) => Promise<void>
  createCourse: (input: CourseInput) => Promise<void>
  updateCourse: (id: string, input: CourseInput) => Promise<void>
  setCourseStatus: (id: string, status: CourseStatus) => Promise<void>
  createEnrollment: (input: EnrollmentInput) => Promise<void>
  updateEnrollmentStatus: (id: string, status: EnrollmentStatus) => Promise<void>
  attendanceSessions: AttendanceSession[]
  attendanceEntries: AttendanceEntry[]
  feeObligations: FeeObligation[]
  feePayments: FeePayment[]
  saveAttendanceSession: (courseId: string, sessionDate: string, statusByStudent: Record<string, AttendanceStatus>) => Promise<void>
  createFeeObligation: (input: FeeObligationInput) => Promise<void>
  createPayment: (input: FeePaymentInput) => Promise<void>
  reversePayment: (id: string) => Promise<void>
}

function isStudentStatus(value: unknown): value is StudentStatus {
  return value === 'active' || value === 'inactive' || value === 'withdrawn'
}

function isTeacherStatus(value: unknown): value is TeacherStatus {
  return value === 'active' || value === 'inactive'
}

function isCourseStatus(value: unknown): value is CourseStatus {
  return value === 'active' || value === 'archived'
}

function isEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return value === 'active' || value === 'withdrawn' || value === 'completed'
}

function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return value === 'present' || value === 'absent' || value === 'late'
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([])
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([])
  const [feeObligations, setFeeObligations] = useState<FeeObligation[]>([])
  const [feePayments, setFeePayments] = useState<FeePayment[]>([])
  const [studentDataError, setStudentDataError] = useState('')
  const [teacherDataError, setTeacherDataError] = useState('')
  const [courseDataError, setCourseDataError] = useState('')
  const [authError, setAuthError] = useState(
    supabase
      ? ''
      : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env file, then restart Vite.',
  )
  const [loading, setLoading] = useState(Boolean(supabase))

  const applySnapshot = useCallback((snapshot: Awaited<ReturnType<typeof loadAcademySnapshot>>) => {
    setStaffProfiles(snapshot.staffProfiles)
    setStudents(snapshot.students)
    setTeachers(snapshot.teachers)
    setCourses(snapshot.courses)
    setEnrollments(snapshot.enrollments)
    setAttendanceSessions(snapshot.attendanceSessions)
    setAttendanceEntries(snapshot.attendanceEntries)
    setFeeObligations(snapshot.feeObligations)
    setFeePayments(snapshot.feePayments)
    setStudentDataError('')
    setTeacherDataError('')
    setCourseDataError('')
  }, [])

  const refreshData = useCallback(async (targetProfile: StaffProfile | null = profile) => {
    if (!targetProfile) return
    const snapshot = await loadAcademySnapshot(targetProfile)
    applySnapshot(snapshot)
  }, [applySnapshot, profile])

  useEffect(() => {
    let active = true
    let requestId = 0

    const resetData = () => {
      setStaffProfiles([])
      setStudents([])
      setTeachers([])
      setCourses([])
      setEnrollments([])
      setAttendanceSessions([])
      setAttendanceEntries([])
      setFeeObligations([])
      setFeePayments([])
      setStudentDataError('')
      setTeacherDataError('')
      setCourseDataError('')
    }

    const hydrate = async (authSession: Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']) => {
      const request = ++requestId
      setLoading(true)
      setAuthError('')
      if (!authSession) {
        setSession(null)
        setProfile(null)
        resetData()
        setLoading(false)
        return
      }

      const nextSession: SessionUser = {
        id: authSession.user.id,
        email: authSession.user.email ?? '',
        authenticatedAt: new Date().toISOString(),
      }
      setSession(nextSession)
      try {
        const nextProfile = await loadStaffProfile(authSession.user.id)
        if (!active || request !== requestId) return
        setProfile(nextProfile)
        if (!nextProfile) {
          resetData()
          return
        }
        const snapshot = await loadAcademySnapshot(nextProfile)
        if (!active || request !== requestId) return
        applySnapshot(snapshot)
      } catch (error) {
        if (!active || request !== requestId) return
        resetData()
        setAuthError(error instanceof Error ? error.message : 'Unable to load your Supabase account.')
      } finally {
        if (active && request === requestId) setLoading(false)
      }
    }

    if (!supabase) {
      return () => {
        active = false
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
      window.setTimeout(() => {
        if (active) void hydrate(authSession)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySnapshot])

  const signIn = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Email and password are required.')
    }
    if (!supabase) throw new Error('Supabase is not configured. Restart Vite after setting the root .env values.')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(`Unable to sign in: ${error.message}`)
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(`Unable to sign out: ${error.message}`)
  }

  const createProfile = async (payload: StaffProfileInput) => {
    void payload
    throw new Error('Staff profiles are provisioned by an administrator. Ask your academy administrator to invite your account.')
  }

  const validateStaffProfileInput = useCallback((payload: StaffProfileInput, existingId?: string) => {
    const normalizedEmail = payload.email.trim().toLowerCase()
    const fullName = payload.fullName.trim()

    if (!fullName) {
      throw new Error('Full name is required.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address.')
    }

    if (!['administrator', 'teacher', 'finance'].includes(payload.role)) {
      throw new Error('Select a valid staff role.')
    }

    const profiles = staffProfiles
    if (
      profiles.some(
        (entry) =>
          entry.id !== existingId && entry.email.trim().toLowerCase() === normalizedEmail,
      )
    ) {
      throw new Error('A staff profile already exists for that email.')
    }

    return { profiles, fullName, normalizedEmail }
  }, [staffProfiles])

  const ensureActiveAdministratorRemains = (
    profiles: StaffProfile[],
    targetId: string,
    nextRole: Role,
    nextStatus: StaffStatus,
  ) => {
    const hasActiveAdministrator = profiles.some((entry) =>
      entry.id === targetId
        ? nextRole === 'administrator' && nextStatus === 'active'
        : entry.role === 'administrator' && entry.status === 'active',
    )

    if (!hasActiveAdministrator) {
      throw new Error('At least one active administrator must remain.')
    }
  }

  const createStaffProfile = useCallback(async (payload: StaffProfileInput) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage staff profiles.')
    }
    const { fullName, normalizedEmail } = validateStaffProfileInput(payload)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'invite', email: normalizedEmail, fullName, role: payload.role },
    })
    if (error) throw new Error(`Unable to invite staff member: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, validateStaffProfileInput])

  const updateStaffProfile = useCallback(async (id: string, payload: StaffProfileInput) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage staff profiles.')
    }
    const { profiles, fullName, normalizedEmail } = validateStaffProfileInput(payload, id)
    const existingProfile = profiles.find((entry) => entry.id === id)
    if (!existingProfile) {
      throw new Error('The staff profile could not be found.')
    }

    ensureActiveAdministratorRemains(profiles, id, payload.role, existingProfile.status)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.functions.invoke('manage-staff', {
      body: {
        action: 'update',
        userId: id,
        email: normalizedEmail,
        fullName,
        role: payload.role,
      },
    })
    if (error) throw new Error(`Unable to update staff profile: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, validateStaffProfileInput])

  const setStaffStatus = useCallback(async (id: string, status: StaffStatus) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage staff profiles.')
    }
    const actor = profile
    const profiles = staffProfiles
    const existingProfile = profiles.find((entry) => entry.id === id)
    if (!existingProfile) {
      throw new Error('The staff profile could not be found.')
    }
    if (status !== 'active' && status !== 'inactive') {
      throw new Error('Select a valid staff status.')
    }

    ensureActiveAdministratorRemains(profiles, id, existingProfile.role, status)
    if (id === actor.id && status === 'inactive') {
      throw new Error('You cannot deactivate your own active profile.')
    }

    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'set-status', userId: id, status },
    })
    if (error) throw new Error(`Unable to update staff status: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, staffProfiles])

  const validateStudentInput = useCallback((input: StudentInput, existingId?: string) => {
    if (!profile || !['administrator', 'finance'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Only an active administrator or finance staff member can manage student records.')
    }

    const studentIdentifier = input.studentIdentifier.trim()
    const fullName = input.fullName.trim()
    const email = input.email.trim().toLowerCase()
    const phone = input.phone.trim()

    if (!studentIdentifier) throw new Error('Student identifier is required.')
    if (!fullName) throw new Error('Full name is required.')
    if (!input.enrollmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.enrollmentDate)) {
      throw new Error('A valid enrollment date is required.')
    }
    const enrollmentDate = new Date(`${input.enrollmentDate}T00:00:00`)
    if (Number.isNaN(enrollmentDate.getTime()) || enrollmentDate.toISOString().slice(0, 10) !== input.enrollmentDate) {
      throw new Error('Enter a valid enrollment date.')
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.')
    }
    if (!isStudentStatus(input.status)) {
      throw new Error('Select a valid student status.')
    }

    const storedStudents = students
    if (
      storedStudents.some(
        (student) =>
          student.id !== existingId &&
          student.studentIdentifier.trim().toLowerCase() === studentIdentifier.toLowerCase(),
      )
    ) {
      throw new Error('A student already exists with that identifier.')
    }

    return { storedStudents, studentIdentifier, fullName, email, phone }
  }, [profile, students])

  const createStudent = useCallback(async (input: StudentInput) => {
    const actor = profile
    const { ...validated } = validateStudentInput(input)
    if (!actor) throw new Error('Your staff profile is no longer available.')
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from('students').insert({
      student_number: validated.studentIdentifier,
      full_name: validated.fullName,
      email: validated.email,
      phone: validated.phone,
      enrolled_on: input.enrollmentDate,
      status: input.status,
      created_by: actor.id,
      updated_by: actor.id,
    })
    if (error) throw new Error(`Unable to create student: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, validateStudentInput])

  const updateStudent = useCallback(async (id: string, input: StudentInput) => {
    const actor = profile
    const { ...validated } = validateStudentInput(input, id)
    if (!actor) throw new Error('Your staff profile is no longer available.')
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from('students').update({
      student_number: validated.studentIdentifier,
      full_name: validated.fullName,
      email: validated.email,
      phone: validated.phone,
      enrolled_on: input.enrollmentDate,
      status: input.status,
    }).eq('id', id)
    if (error) throw new Error(`Unable to update student: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, validateStudentInput])

  const setStudentStatus = useCallback(async (id: string, status: StudentStatus) => {
    if (!profile || !['administrator', 'finance'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Only an active administrator or finance staff member can manage student records.')
    }
    if (!isStudentStatus(status)) throw new Error('Select a valid student status.')
    const existing = students.find((student) => student.id === id)
    if (!existing) throw new Error('The student record could not be found.')
    await setStudentStatusInDatabase(id, status)
    await refreshData()
  }, [profile, refreshData, students])

  const normalizeCourseList = useCallback((value: string): string[] => {
    const items = value
      .split(/[\n,]+/)
      .map((course) => course.trim())
      .filter(Boolean)

    const unique = new Map<string, string>()
    for (const course of items) {
      const key = course.toLowerCase()
      if (!unique.has(key)) {
        unique.set(key, course)
      }
    }

    return Array.from(unique.values())
  }, [])

  const validateTeacherInput = useCallback((input: TeacherInput, existingId?: string) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage teacher records.')
    }

    const teacherIdentifier = input.teacherIdentifier.trim()
    const fullName = input.fullName.trim()
    const email = input.email.trim().toLowerCase()
    const phone = input.phone.trim()
    const specialization = input.specialization.trim()
    const assignedCourses = normalizeCourseList(input.assignedCourses.join(', '))

    if (!teacherIdentifier) throw new Error('Teacher identifier is required.')
    if (!fullName) throw new Error('Full name is required.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.')
    }
    if (!isTeacherStatus(input.status)) {
      throw new Error('Select a valid teacher status.')
    }

    const storedTeachers = teachers
    if (
      storedTeachers.some(
        (teacher) =>
          teacher.id !== existingId &&
          teacher.teacherIdentifier.trim().toLowerCase() === teacherIdentifier.toLowerCase(),
      )
    ) {
      throw new Error('A teacher already exists with that identifier.')
    }

    return { storedTeachers, teacherIdentifier, fullName, email, phone, specialization, assignedCourses }
  }, [normalizeCourseList, profile, teachers])

  const resolveAssignedCourseIds = useCallback((labels: string[]) => {
    return labels.map((label) => {
      const normalized = label.trim().toLowerCase()
      const course = courses.find((entry) =>
        entry.id.toLowerCase() === normalized ||
        entry.courseCode.toLowerCase() === normalized ||
        entry.title.toLowerCase() === normalized,
      )
      if (!course) throw new Error(`Assigned course "${label}" does not match an existing course.`)
      return course.id
    })
  }, [courses])

  const createTeacher = useCallback(async (input: TeacherInput) => {
    if (!profile) throw new Error('Your staff profile is no longer available.')
    const { ...validated } = validateTeacherInput(input)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.rpc('save_teacher', {
      p_teacher_id: null,
      p_teacher_number: validated.teacherIdentifier,
      p_full_name: validated.fullName,
      p_email: validated.email || null,
      p_phone: validated.phone,
      p_specialization: validated.specialization,
      p_status: input.status,
      p_course_ids: resolveAssignedCourseIds(validated.assignedCourses),
    })
    if (error) throw new Error(`Unable to create teacher: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, resolveAssignedCourseIds, validateTeacherInput])

  const updateTeacher = useCallback(async (id: string, input: TeacherInput) => {
    if (!profile) throw new Error('Your staff profile is no longer available.')
    const { ...validated } = validateTeacherInput(input, id)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.rpc('save_teacher', {
      p_teacher_id: id,
      p_teacher_number: validated.teacherIdentifier,
      p_full_name: validated.fullName,
      p_email: validated.email || null,
      p_phone: validated.phone,
      p_specialization: validated.specialization,
      p_status: input.status,
      p_course_ids: resolveAssignedCourseIds(validated.assignedCourses),
    })
    if (error) throw new Error(`Unable to update teacher: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, resolveAssignedCourseIds, validateTeacherInput])

  const setTeacherStatus = useCallback(async (id: string, status: TeacherStatus) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage teacher records.')
    }
    if (!isTeacherStatus(status)) throw new Error('Select a valid teacher status.')
    const existing = teachers.find((teacher) => teacher.id === id)
    if (!existing) throw new Error('The teacher record could not be found.')
    await setTeacherStatusInDatabase(id, status)
    await refreshData()
  }, [profile, refreshData, teachers])

  const validateCourseInput = useCallback((input: CourseInput, existingId?: string) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage courses.')
    }

    const courseCode = input.courseCode.trim()
    const title = input.title.trim()
    const description = input.description.trim()
    const credits = Number(input.credits)
    const teacherIds = [...new Set(input.teacherIds.map((teacherId) => teacherId.trim()).filter(Boolean))]

    if (!courseCode) throw new Error('Course code is required.')
    if (!title) throw new Error('Course title is required.')
    if (!Number.isFinite(credits) || credits <= 0) throw new Error('Credits must be greater than zero.')
    if (!isCourseStatus(input.status)) throw new Error('Select a valid course status.')

    const storedCourses = courses
    if (storedCourses.some((course) => course.id !== existingId && course.courseCode.trim().toLowerCase() === courseCode.toLowerCase())) {
      throw new Error('A course already exists with that code.')
    }

    return { storedCourses, courseCode, title, description, credits, teacherIds }
  }, [courses, profile])

  const createCourse = useCallback(async (input: CourseInput) => {
    if (!profile) throw new Error('Your staff profile is no longer available.')
    const { ...validated } = validateCourseInput(input)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.rpc('save_course', {
      p_course_id: null,
      p_course_code: validated.courseCode,
      p_name: validated.title,
      p_description: validated.description,
      p_credits: validated.credits,
      p_status: input.status,
      p_teacher_ids: validated.teacherIds,
    })
    if (error) throw new Error(`Unable to create course: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, validateCourseInput])

  const updateCourse = useCallback(async (id: string, input: CourseInput) => {
    if (!profile) throw new Error('Your staff profile is no longer available.')
    const { ...validated } = validateCourseInput(input, id)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.rpc('save_course', {
      p_course_id: id,
      p_course_code: validated.courseCode,
      p_name: validated.title,
      p_description: validated.description,
      p_credits: validated.credits,
      p_status: input.status,
      p_teacher_ids: validated.teacherIds,
    })
    if (error) throw new Error(`Unable to update course: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, validateCourseInput])

  const setCourseStatus = useCallback(async (id: string, status: CourseStatus) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage courses.')
    }
    if (!isCourseStatus(status)) throw new Error('Select a valid course status.')
    const existing = courses.find((course) => course.id === id)
    if (!existing) throw new Error('The course record could not be found.')
    await setCourseStatusInDatabase(id, status)
    await refreshData()
  }, [courses, profile, refreshData])

  const createEnrollment = useCallback(async (input: EnrollmentInput) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage enrollments.')
    }

    const storedEnrollments = enrollments
    const courseExists = courses.some((course) => course.id === input.courseId)
    const studentExists = students.some((student) => student.id === input.studentId)
    if (!courseExists) throw new Error('The course could not be found.')
    if (!studentExists) throw new Error('The student could not be found.')
    if (storedEnrollments.some((enrollment) => enrollment.studentId === input.studentId && enrollment.courseId === input.courseId && enrollment.status === 'active')) {
      throw new Error('This student is already enrolled in the course.')
    }

    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from('enrollments').insert({
      student_id: input.studentId,
      course_id: input.courseId,
      status: input.status,
      enrolled_on: new Date().toISOString().slice(0, 10),
      created_by: profile.id,
      updated_by: profile.id,
    })
    if (error) throw new Error(`Unable to create enrollment: ${error.message}`)
    await refreshData()
  }, [courses, enrollments, profile, refreshData, students])

  const updateEnrollmentStatus = useCallback(async (id: string, status: EnrollmentStatus) => {
    if (!profile || profile.role !== 'administrator' || profile.status !== 'active') {
      throw new Error('Only an active administrator can manage enrollments.')
    }
    if (!isEnrollmentStatus(status)) throw new Error('Select a valid enrollment status.')

    const existing = enrollments.find((enrollment) => enrollment.id === id)
    if (!existing) throw new Error('The enrollment record could not be found.')
    await setEnrollmentStatusInDatabase(id, status)
    await refreshData()
  }, [enrollments, profile, refreshData])

  const createFeeObligation = useCallback(async (input: FeeObligationInput) => {
    if (!profile || !['administrator', 'finance'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Only an active administrator or finance staff member can manage fee obligations.')
    }

    if (!input.studentId) {
      throw new Error('Choose a student before creating the fee obligation.')
    }

    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Fee obligation amount must be greater than zero.')
    }

    if (!/^(\d{4}-\d{2}-\d{2})$/.test(input.dueDate)) {
      throw new Error('Select a valid due date.')
    }

    if (!students.some((student) => student.id === input.studentId)) {
      throw new Error('The selected student could not be found.')
    }

    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from('fee_obligations').insert({
      student_id: input.studentId,
      enrollment_id: input.enrollmentId || null,
      description: input.description.trim() || 'General fee obligation',
      amount,
      due_on: input.dueDate,
      status: 'open',
      created_by: profile.id,
      updated_by: profile.id,
    })
    if (error) throw new Error(`Unable to create fee obligation: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, students])

  const createPayment = useCallback(async (input: FeePaymentInput) => {
    if (!profile || !['administrator', 'finance'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Only an active administrator or finance staff member can record payments.')
    }

    if (!input.studentId) {
      throw new Error('Choose a student before recording a payment.')
    }

    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    if (!/^(\d{4}-\d{2}-\d{2})$/.test(input.paymentDate)) {
      throw new Error('Select a valid payment date.')
    }

    if (!students.some((student) => student.id === input.studentId)) {
      throw new Error('The selected student could not be found.')
    }

    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.rpc('record_payment', {
      p_student_id: input.studentId,
      p_obligation_id: input.obligationId || null,
      p_amount: amount,
      p_paid_on: input.paymentDate,
      p_method: input.method,
      p_reference: input.reference.trim() || 'Manual entry',
      p_note: input.notes.trim(),
    })
    if (error) throw new Error(`Unable to record payment: ${error.message}`)
    await refreshData()
  }, [profile, refreshData, students])

  const reversePayment = useCallback(async (id: string) => {
    if (!profile || !['administrator', 'finance'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Only an active administrator or finance staff member can reverse payments.')
    }

    const existingPayment = feePayments.find((entry) => entry.id === id)
    if (!existingPayment) {
      throw new Error('The payment record could not be found.')
    }
    if (existingPayment.status === 'reversed') throw new Error('This payment has already been reversed.')
    throw new Error('Payment reversals are temporarily unavailable until the audited reversal workflow is approved.')
  }, [feePayments, profile])

  const saveAttendanceSession = useCallback(async (
    courseId: string,
    sessionDate: string,
    statusByStudent: Record<string, AttendanceStatus>,
  ) => {
    if (!profile || !['administrator', 'teacher'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Only an active administrator or teacher can record attendance.')
    }

    if (!courseId) {
      throw new Error('Choose a course before saving attendance.')
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      throw new Error('Select a valid session date.')
    }

    const rosterEnrollments = enrollments.filter(
      (enrollment) => enrollment.courseId === courseId && enrollment.status === 'active',
    )

    if (!rosterEnrollments.length) {
      throw new Error('This course does not have an active enrollment roster.')
    }

    const course = courses.find((entry) => entry.id === courseId)
    if (!course) {
      throw new Error('The selected course could not be found.')
    }

    if (profile.role === 'teacher') {
      const relatedTeacher = teachers.find(
        (teacher) =>
          teacher.status === 'active' &&
          (teacher.email.toLowerCase() === profile.email.toLowerCase() ||
            teacher.fullName.trim().toLowerCase() === profile.fullName.trim().toLowerCase()),
      )

      if (!relatedTeacher) {
        throw new Error('Your teacher profile is not linked to an assigned course.')
      }

      const isAssigned = course.teacherIds.includes(relatedTeacher.id) ||
        relatedTeacher.assignedCourses.includes(course.id) ||
        relatedTeacher.assignedCourses.some(
          (value) => value.trim().toLowerCase() === course.courseCode.trim().toLowerCase() || value.trim().toLowerCase() === course.title.trim().toLowerCase(),
        )

      if (!isAssigned) {
        throw new Error('This teacher is not assigned to the selected course.')
      }
    }

    const rosterStudentIds = new Set(rosterEnrollments.map((enrollment) => enrollment.studentId))
    const missingStudents = Array.from(rosterStudentIds).filter((studentId) => !(studentId in statusByStudent))

    if (missingStudents.length) {
      throw new Error('Mark every enrolled student before saving the session.')
    }

    const invalidStatus = Object.values(statusByStudent).find((value) => !isAttendanceStatus(value))
    if (invalidStatus) {
      throw new Error('Choose a valid attendance status for each student.')
    }

    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.rpc('save_attendance_session', {
      p_course_id: courseId,
      p_session_date: sessionDate,
      p_entries: Array.from(rosterStudentIds, (studentId) => ({
        student_id: studentId,
        status: statusByStudent[studentId],
      })),
    })
    if (error) throw new Error(`Unable to save attendance: ${error.message}`)
    await refreshData()
  }, [courses, enrollments, profile, refreshData, teachers])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      staffProfiles,
      students,
      teachers,
      courses,
      enrollments,
      studentDataError,
      teacherDataError,
      courseDataError,
      authError,
      loading,
      signIn,
      signOut,
      createProfile,
      createStaffProfile,
      updateStaffProfile,
      setStaffStatus,
      createStudent,
      updateStudent,
      setStudentStatus,
      createTeacher,
      updateTeacher,
      setTeacherStatus,
      createCourse,
      updateCourse,
      setCourseStatus,
      createEnrollment,
      updateEnrollmentStatus,
      attendanceSessions,
      attendanceEntries,
      feeObligations,
      feePayments,
      saveAttendanceSession,
      createFeeObligation,
      createPayment,
      reversePayment,
    }),
    [
      loading,
      profile,
      session,
      staffProfiles,
      students,
      teachers,
      courses,
      enrollments,
      attendanceSessions,
      attendanceEntries,
      feeObligations,
      feePayments,
      studentDataError,
      teacherDataError,
      courseDataError,
      authError,
      createStaffProfile,
      updateStaffProfile,
      setStaffStatus,
      createStudent,
      updateStudent,
      setStudentStatus,
      createTeacher,
      updateTeacher,
      setTeacherStatus,
      createCourse,
      updateCourse,
      setCourseStatus,
      createEnrollment,
      updateEnrollmentStatus,
      saveAttendanceSession,
      createFeeObligation,
      createPayment,
      reversePayment,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.')
  }

  return context
}

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[]
  children?: React.ReactNode
}) {
  const { session, profile, loading, authError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState message="Checking access..." />
  }

  if (authError) {
    return <LoadingState message={authError} />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!profile) {
    return <Navigate to="/profile-setup" replace state={{ from: location.pathname }} />
  }

  if (profile.status !== 'active') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/access-denied" replace />
  }

  return children ?? <Outlet />
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, authError } = useAuth()

  if (loading) {
    return <LoadingState message="Preparing sign-in view..." />
  }

  if (authError) {
    return <LoadingState message={authError} />
  }

  if (session && profile) {
    return <Navigate to="/dashboard" replace />
  }

  if (session && !profile) {
    return <Navigate to="/profile-setup" replace />
  }

  return <>{children}</>
}

function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', allowed: ['administrator', 'teacher', 'finance'] },
    { to: '/staff', label: 'Staff', allowed: ['administrator'] },
    { to: '/students', label: 'Students', allowed: ['administrator', 'finance'] },
    { to: '/teachers', label: 'Teachers', allowed: ['administrator', 'teacher'] },
    { to: '/courses', label: 'Courses', allowed: ['administrator', 'teacher'] },
    { to: '/attendance', label: 'Attendance', allowed: ['administrator', 'teacher'] },
    { to: '/fees', label: 'Fees', allowed: ['administrator', 'finance'] },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">
              Academy Management System
            </p>
            <p className="mt-1 text-sm text-slate-300">{profile?.fullName ?? 'Staff portal'}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
              {profile?.role ?? 'member'}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl flex-wrap gap-3 px-6 py-4">
          {navItems
            .filter((item) => item.allowed.includes(profile?.role ?? ''))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: string } | undefined)?.from ?? '/dashboard'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">
          Phase 2
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">Staff sign in</h1>
        <p className="mb-6 text-sm text-slate-300">
          Sign in with the academy staff account and password provided by your administrator.
        </p>

        <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
          Staff access is invitation-only. Contact your administrator if you need an account.
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              placeholder="name@academy.local"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}

function ProfileSetupPage() {
  const { createProfile, profile } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(profile?.fullName ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [role, setRole] = useState<Role>('teacher')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await createProfile({ fullName, email, role })
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create your staff profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">
          Staff profile setup
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">Complete staff profile setup</h1>
        <p className="mb-6 text-sm text-slate-300">
          Staff roles are assigned by an administrator. Contact your administrator to link this account to an active staff profile.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-200">
              Full name
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-violet-500"
              placeholder="Alex Johnson"
            />
          </div>

          <div>
            <label htmlFor="profileEmail" className="mb-2 block text-sm font-medium text-slate-200">
              Business email
            </label>
            <input
              id="profileEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-violet-500"
              placeholder="alex@academy.local"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-200">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-violet-500"
            >
              <option value="administrator">Administrator</option>
              <option value="teacher">Teacher</option>
              <option value="finance">Finance</option>
            </select>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {isSubmitting ? 'Saving profile...' : 'Create profile'}
          </button>
        </form>
      </div>
    </main>
  )
}

function DashboardPage() {
  const {
    profile,
    staffProfiles,
    students,
    teachers,
    courses,
    enrollments,
    attendanceSessions,
    attendanceEntries,
    feeObligations,
    loading,
    studentDataError,
    teacherDataError,
    courseDataError,
  } = useAuth()

  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  if (loading) {
    return <LoadingState message="Loading dashboard summary..." />
  }

  const role = profile?.role ?? 'administrator'
  const activeStaffCount = staffProfiles.filter((entry) => entry.status === 'active').length
  const activeStudentsCount = students.filter((entry) => entry.status === 'active').length
  const activeCoursesCount = courses.filter((entry) => entry.status === 'active').length

  const studentBalances = students.map((student) => ({
    studentId: student.id,
    balance: feeObligations
      .filter((entry) => entry.studentId === student.id)
      .reduce((total, entry) => total + entry.remainingBalance, 0),
  }))

  const outstandingFees = studentBalances.reduce((total, row) => total + Math.max(row.balance, 0), 0)
  const overdueBalance = feeObligations
    .filter((entry) => entry.status === 'open' && entry.dueDate && entry.dueDate < today)
    .reduce((total, entry) => total + entry.remainingBalance, 0)

  const todaySessionIds = new Set(
    attendanceSessions.filter((session) => session.sessionDate === today).map((session) => session.id),
  )
  const todayEntries = attendanceEntries.filter((entry) => todaySessionIds.has(entry.sessionId))
  const attendanceSummary = {
    present: todayEntries.filter((entry) => entry.status === 'present').length,
    absent: todayEntries.filter((entry) => entry.status === 'absent').length,
    late: todayEntries.filter((entry) => entry.status === 'late').length,
  }

  const teacherProfile = teachers.find(
    (teacher) =>
      teacher.email.toLowerCase() === profile?.email.toLowerCase() ||
      teacher.fullName.trim().toLowerCase() === profile?.fullName.trim().toLowerCase(),
  )
  const assignedCourseIds = new Set(
    teacherProfile
      ? courses
          .filter((course) => course.teacherIds.includes(teacherProfile.id))
          .map((course) => course.id)
      : [],
  )
  const assignedStudentsCount = new Set(
    enrollments
      .filter((entry) => entry.status === 'active' && assignedCourseIds.has(entry.courseId))
      .map((entry) => entry.studentId),
  ).size

  const cards = {
    administrator: [
      { label: 'Active staff', value: String(activeStaffCount), accent: 'sky' },
      { label: 'Active students', value: String(activeStudentsCount), accent: 'violet' },
      { label: 'Active courses', value: String(activeCoursesCount), accent: 'emerald' },
      { label: 'Outstanding fees', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(outstandingFees), accent: 'amber' },
    ],
    teacher: [
      { label: 'Assigned courses', value: String(courses.filter((course) => course.teacherIds.includes(teacherProfile?.id ?? '')).length), accent: 'sky' },
      { label: 'Students in roster', value: String(assignedStudentsCount), accent: 'violet' },
      { label: 'Sessions today', value: String(attendanceSessions.filter((session) => session.sessionDate === today && assignedCourseIds.has(session.courseId)).length), accent: 'emerald' },
      { label: 'Attendance marked', value: String(todayEntries.length), accent: 'amber' },
    ],
    finance: [
      { label: 'Outstanding fees', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(outstandingFees), accent: 'amber' },
      { label: 'Overdue balance', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(overdueBalance), accent: 'rose' },
      { label: 'Active students', value: String(activeStudentsCount), accent: 'violet' },
      { label: 'Active courses', value: String(activeCoursesCount), accent: 'emerald' },
    ],
  }

  const dataError = [studentDataError, teacherDataError, courseDataError].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Overview</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Welcome back, {profile?.fullName}</h1>
        <p className="mt-2 text-slate-300">
          Your access level is set to {profile?.role}. The dashboard reflects the current saved academy records.
        </p>
      </section>

      {dataError ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {dataError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(cards[role] ?? cards.administrator).map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-4 text-3xl font-bold text-white">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Today's attendance</h2>
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
              {today}
            </span>
          </div>

          {todayEntries.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Present</p>
                <p className="mt-2 text-3xl font-bold text-emerald-200">{attendanceSummary.present}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Absent</p>
                <p className="mt-2 text-3xl font-bold text-rose-200">{attendanceSummary.absent}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Late</p>
                <p className="mt-2 text-3xl font-bold text-amber-200">{attendanceSummary.late}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-sm text-slate-400">
              No attendance has been recorded for today yet. Open the attendance module to mark student sessions.
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold text-white">Quick actions</h2>
          <div className="mt-5 space-y-3">
            <NavLink
              to="/students"
              className="block rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
            >
              View active students
            </NavLink>
            <NavLink
              to="/teachers"
              className="block rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
            >
              Review teacher roster
            </NavLink>
            <NavLink
              to="/fees"
              className="block rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
            >
              Manage fee balances
            </NavLink>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold text-white">Operational summary</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>• Active students: {activeStudentsCount}</li>
          <li>• Active teachers: {teachers.filter((entry) => entry.status === 'active').length}</li>
          <li>• Active courses: {activeCoursesCount}</li>
          <li>• Outstanding balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(outstandingFees)}</li>
          <li>• Overdue balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(overdueBalance)}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold text-white">Quality and deployment checks</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>• Role-based route guards enforce access for admin, teacher, and finance views.</li>
          <li>• Form validation blocks invalid inputs, duplicate identifiers, and blank required fields.</li>
          <li>• Payment records must be positive and over-limit entries are flagged for review before final acceptance.</li>
          <li>• Staff authentication and academy records use Supabase Auth, database constraints, and row-level security.</li>
        </ul>
      </section>
    </div>
  )
}

function StaffPage() {
  const { profile, staffProfiles, createStaffProfile, updateStaffProfile, setStaffStatus } = useAuth()

  if (!profile) {
    return null
  }

  return (
    <StaffManagementPage
      profiles={staffProfiles}
      currentProfileId={profile.id}
      onCreate={createStaffProfile}
      onUpdate={updateStaffProfile}
      onStatusChange={setStaffStatus}
    />
  )
}

function StudentsPage() {
  const location = useLocation()
  const {
    profile,
    students,
    studentDataError,
    createStudent,
    updateStudent,
    setStudentStatus,
  } = useAuth()

  if (!profile) return null

  return (
    <StudentManagementPage
      key={location.search}
      students={students}
      storageError={studentDataError}
      onCreate={createStudent}
      onUpdate={updateStudent}
      onStatusChange={setStudentStatus}
    />
  )
}

function StudentDetailsPage() {
  const {
    profile,
    students,
    courses,
    enrollments,
    attendanceSessions,
    attendanceEntries,
    feeObligations,
    feePayments,
  } = useAuth()
  return (
    <StudentDetailPage
      students={students}
      courses={courses}
      enrollments={enrollments}
      attendanceSessions={attendanceSessions}
      attendanceEntries={attendanceEntries}
      canViewAttendance={profile?.role === 'administrator'}
      obligations={feeObligations}
      payments={feePayments}
    />
  )
}

function TeachersPage() {
  const location = useLocation()
  const {
    profile,
    teachers,
    teacherDataError,
    createTeacher,
    updateTeacher,
    setTeacherStatus,
  } = useAuth()

  if (!profile) return null

  return (
    <TeacherManagementPage
      key={location.search}
      teachers={teachers}
      storageError={teacherDataError}
      canManage={profile.role === 'administrator'}
      onCreate={createTeacher}
      onUpdate={updateTeacher}
      onStatusChange={setTeacherStatus}
    />
  )
}

function TeacherDetailsPage() {
  const { profile, teachers } = useAuth()
  return <TeacherDetailPage teachers={teachers} canManage={profile?.role === 'administrator'} />
}

function CoursesPage() {
  const location = useLocation()
  const {
    profile,
    teachers,
    students,
    courses,
    enrollments,
    courseDataError,
    createCourse,
    updateCourse,
    setCourseStatus,
  } = useAuth()

  if (!profile) return null

  return (
    <CourseManagementPage
      key={location.search}
      courses={courses}
      teachers={teachers.map((teacher) => ({ id: teacher.id, fullName: teacher.fullName, status: teacher.status }))}
      students={students.map((student) => ({ id: student.id, fullName: student.fullName, status: student.status }))}
      enrollments={enrollments}
      storageError={courseDataError}
      canManage={profile.role === 'administrator'}
      onCreate={createCourse}
      onUpdate={updateCourse}
      onStatusChange={setCourseStatus}
    />
  )
}

function CourseDetailsPage() {
  const {
    profile,
    teachers,
    students,
    courses,
    enrollments,
    createEnrollment,
    updateEnrollmentStatus,
  } = useAuth()

  return (
    <CourseDetailPage
      courses={courses}
      teachers={teachers.map((teacher) => ({ id: teacher.id, fullName: teacher.fullName, status: teacher.status }))}
      students={students.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        status: student.status,
        studentIdentifier: student.studentIdentifier,
      }))}
      enrollments={enrollments}
      canManage={profile?.role === 'administrator'}
      onEnroll={createEnrollment}
      onStatusChange={updateEnrollmentStatus}
    />
  )
}

function AttendancePage() {
  const {
    profile,
    teachers,
    students,
    courses,
    enrollments,
    attendanceSessions,
    attendanceEntries,
    saveAttendanceSession,
  } = useAuth()

  return (
    <AttendanceManagementPage
      profile={profile}
      courses={courses}
      students={students}
      teachers={teachers}
      enrollments={enrollments}
      sessions={attendanceSessions}
      entries={attendanceEntries}
      onSave={saveAttendanceSession}
    />
  )
}

function FeesPage() {
  const { profile, students, feeObligations, feePayments, createFeeObligation, createPayment, reversePayment } = useAuth()

  if (!profile) {
    return null
  }

  return (
    <FeesManagementPage
      students={students}
      obligations={feeObligations}
      payments={feePayments}
      onCreateObligation={createFeeObligation}
      onCreatePayment={createPayment}
      onReversePayment={reversePayment}
    />
  )
}

function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900/80 p-8 text-center shadow-xl shadow-slate-950/60">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-400">Access denied</p>
        <h1 className="mt-4 text-3xl font-bold text-white">This area is restricted</h1>
        <p className="mt-3 text-slate-300">
          Your current role does not include permission to view this page. Please sign in with an authorized account.
        </p>
        <NavLink
          to="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400"
        >
          Return to dashboard
        </NavLink>
      </div>
    </main>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300">
        {message}
      </div>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute allowedRoles={['administrator', 'teacher', 'finance']}>
              <ProfileSetupPage />
            </ProtectedRoute>
          }
        />

        <Route element={<ProtectedRoute allowedRoles={['administrator', 'teacher', 'finance']} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <StaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'finance']}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:studentId"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'finance']}>
                  <StudentDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'teacher']}>
                  <TeachersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/:teacherId"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'teacher']}>
                  <TeacherDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'teacher']}>
                  <CoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'teacher']}>
                  <CourseDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'teacher']}>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fees"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'finance']}>
                  <FeesPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>

        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
