import { useMemo, useState } from 'react'
import type { Course, Enrollment } from '../courses/types'
import type { StaffProfile } from '../staff/types'
import type { Student } from '../students/types'
import type { Teacher } from '../teachers/types'
import type { AttendanceEntry, AttendanceSession, AttendanceStatus } from './types'

type AttendanceManagementPageProps = {
  profile: StaffProfile | null
  courses: Course[]
  students: Student[]
  teachers: Teacher[]
  enrollments: Enrollment[]
  sessions: AttendanceSession[]
  entries: AttendanceEntry[]
  onSave: (courseId: string, sessionDate: string, statusByStudent: Record<string, AttendanceStatus>) => Promise<void>
}

const statusStyles: Record<AttendanceStatus, string> = {
  present: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  absent: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  late: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
}

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
}

function AttendanceManagementPage({
  profile,
  courses,
  students,
  teachers,
  enrollments,
  sessions,
  entries,
  onSave,
}: AttendanceManagementPageProps) {
  const accessibleCourses = useMemo(() => {
    if (!profile) return []

    if (profile.role === 'administrator') {
      return courses
    }

    const teacherMatch = teachers.find(
      (teacher) =>
        teacher.status === 'active' &&
        (teacher.email.toLowerCase() === profile.email.toLowerCase() ||
          teacher.fullName.trim().toLowerCase() === profile.fullName.trim().toLowerCase()),
    )

    if (!teacherMatch) {
      return []
    }

    return courses.filter((course) => {
      if (course.status !== 'active') {
        return false
      }

      const courseCode = course.courseCode.trim().toLowerCase()
      const courseTitle = course.title.trim().toLowerCase()

      return (
        course.teacherIds.includes(teacherMatch.id) ||
        teacherMatch.assignedCourses.includes(course.id) ||
        teacherMatch.assignedCourses.some(
          (value) => value.trim().toLowerCase() === courseCode || value.trim().toLowerCase() === courseTitle,
        )
      )
    })
  }, [courses, profile, teachers])

  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [attendanceByStudent, setAttendanceByStudent] = useState<Record<string, AttendanceStatus>>({})
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const buildAttendanceStateForSession = (courseId: string, date: string) => {
    const rosterEntries = enrollments.filter(
      (enrollment) => enrollment.courseId === courseId && enrollment.status === 'active',
    )
    const targetSession = sessions.find((entry) => entry.courseId === courseId && entry.sessionDate === date) ?? null
    const nextStatusByStudent: Record<string, AttendanceStatus> = {}

    for (const enrollment of rosterEntries) {
      const savedEntry = targetSession
        ? entries.find((candidate) => candidate.sessionId === targetSession.id && candidate.studentId === enrollment.studentId)
        : undefined
      nextStatusByStudent[enrollment.studentId] = savedEntry?.status ?? 'present'
    }

    return nextStatusByStudent
  }

  const effectiveSelectedCourseId = useMemo(() => {
    if (!accessibleCourses.length) {
      return ''
    }

    if (!selectedCourseId || !accessibleCourses.some((course) => course.id === selectedCourseId)) {
      return accessibleCourses[0].id
    }

    return selectedCourseId
  }, [accessibleCourses, selectedCourseId])

  const selectedCourse = accessibleCourses.find((course) => course.id === effectiveSelectedCourseId) ?? null
  const courseSessions = useMemo(
    () =>
      sessions
        .filter((entry) => entry.courseId === effectiveSelectedCourseId)
        .sort((left, right) => new Date(right.sessionDate).getTime() - new Date(left.sessionDate).getTime()),
    [effectiveSelectedCourseId, sessions],
  )
  const activeRoster = useMemo(
    () =>
      enrollments
        .filter((enrollment) => enrollment.courseId === effectiveSelectedCourseId && enrollment.status === 'active')
        .map((enrollment) => {
          const student = students.find((candidate) => candidate.id === enrollment.studentId)
          return student ? { ...enrollment, student } : null
        })
        .filter((entry): entry is Enrollment & { student: Student } => entry !== null),
    [effectiveSelectedCourseId, enrollments, students],
  )

  const session = useMemo(
    () => sessions.find((entry) => entry.courseId === effectiveSelectedCourseId && entry.sessionDate === sessionDate) ?? null,
    [effectiveSelectedCourseId, sessionDate, sessions],
  )

  const sessionEntries = useMemo(
    () => (session ? entries.filter((entry) => entry.sessionId === session.id) : []),
    [entries, session],
  )

  const resolvedAttendanceByStudent = useMemo(() => {
    const nextStatusByStudent: Record<string, AttendanceStatus> = { ...attendanceByStudent }

    for (const entry of activeRoster) {
      const savedStatus = sessionEntries.find((item) => item.studentId === entry.studentId)?.status
      if (!nextStatusByStudent[entry.studentId]) {
        nextStatusByStudent[entry.studentId] = savedStatus ?? 'present'
      }
    }

    return nextStatusByStudent
  }, [activeRoster, attendanceByStudent, sessionEntries])

  const handleCourseChange = (nextCourseId: string) => {
    setSelectedCourseId(nextCourseId)
    setAttendanceByStudent(buildAttendanceStateForSession(nextCourseId, sessionDate))
  }

  const handleDateChange = (nextDate: string) => {
    setSessionDate(nextDate)
    setAttendanceByStudent(buildAttendanceStateForSession(effectiveSelectedCourseId, nextDate))
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setFormError('')
    setSuccessMessage('')
    setAttendanceByStudent((current) => ({
      ...current,
      [studentId]: status,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!effectiveSelectedCourseId) {
      setFormError('Choose a course before saving attendance.')
      return
    }

    if (!sessionDate) {
      setFormError('Choose a date for the class session.')
      return
    }

    if (!activeRoster.length) {
      setFormError('This course does not have an active roster for attendance.')
      return
    }

    setIsSaving(true)

    try {
      await onSave(effectiveSelectedCourseId, sessionDate, resolvedAttendanceByStudent)
      setAttendanceByStudent(buildAttendanceStateForSession(effectiveSelectedCourseId, sessionDate))
      setSuccessMessage('Attendance saved successfully.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save attendance.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!profile) {
    return null
  }

  const unreadCount = activeRoster.filter((entry) => !sessionEntries.some((item) => item.studentId === entry.studentId)).length

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Attendance</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Class attendance</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Review the current course roster, mark attendance for the selected session date, and save a complete session record.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Assigned courses</p>
          <p className="mt-3 text-3xl font-bold text-white">{accessibleCourses.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Roster size</p>
          <p className="mt-3 text-3xl font-bold text-white">{activeRoster.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Session status</p>
          <p className="mt-3 text-2xl font-bold text-white">
            {session ? 'Recorded' : unreadCount === 0 ? 'Ready' : 'Pending'}
          </p>
        </article>
      </section>

      {selectedCourse ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Session review</h2>
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
              {courseSessions.length} recorded dates
            </span>
          </div>

          {courseSessions.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {courseSessions.map((courseSession) => {
                const sessionEntryCount = entries.filter((entry) => entry.sessionId === courseSession.id).length
                const isComplete = activeRoster.length > 0 && sessionEntryCount === activeRoster.length
                const isSelected = session?.id === courseSession.id

                return (
                  <button
                    key={courseSession.id}
                    type="button"
                    onClick={() => handleDateChange(courseSession.sessionDate)}
                    className={[
                      'rounded-xl border p-3 text-left transition',
                      isSelected
                        ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                        : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500',
                    ].join(' ')}
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{courseSession.sessionDate}</p>
                    <p className="mt-2 text-sm font-medium">
                      {isComplete ? 'Fully marked' : 'Needs review'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {sessionEntryCount}/{Math.max(activeRoster.length, 0)} entries complete
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
              No session history is available for this course yet.
            </div>
          )}
        </section>
      ) : null}

      {formError ? (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {formError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {successMessage}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <label htmlFor="attendance-course" className="mb-2 block text-sm font-medium text-slate-200">
                Course
              </label>
              <select
                id="attendance-course"
                value={effectiveSelectedCourseId}
                onChange={(event) => handleCourseChange(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                {accessibleCourses.length ? (
                  accessibleCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.courseCode} · {course.title}
                    </option>
                  ))
                ) : (
                  <option value="">No courses available</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="attendance-date" className="mb-2 block text-sm font-medium text-slate-200">
                Session date
              </label>
              <input
                id="attendance-date"
                type="date"
                value={sessionDate}
                onChange={(event) => handleDateChange(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
          </div>

          {selectedCourse ? (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Selected course</p>
                  <h2 className="text-xl font-semibold text-white">{selectedCourse.title}</h2>
                </div>
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
                  {selectedCourse.status}
                </span>
              </div>

              {activeRoster.length ? (
                <div className="space-y-3">
                  {activeRoster.map((entry) => {
                    const studentId = entry.studentId
                    const currentStatus = resolvedAttendanceByStudent[studentId] ?? 'present'
                    const previousEntry = sessionEntries.find((item) => item.studentId === studentId)

                    return (
                      <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium text-white">{entry.student.fullName}</p>
                            <p className="text-sm text-slate-400">{entry.student.studentIdentifier}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(['present', 'absent', 'late'] as AttendanceStatus[]).map((status) => (
                              <button
                                key={`${studentId}-${status}`}
                                type="button"
                                onClick={() => handleStatusChange(studentId, status)}
                                className={[
                                  'rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition',
                                  currentStatus === status ? statusStyles[status] : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500',
                                ].join(' ')}
                              >
                                {statusLabels[status]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {previousEntry ? (
                          <p className="mt-3 text-xs text-slate-400">
                            Existing session value: {statusLabels[previousEntry.status]}.
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-slate-400">No previous attendance recorded for this session.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
                  No active roster is available for this course.
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-400">
                  {session
                    ? `Session captured on ${session.sessionDate}.`
                    : unreadCount === 0
                      ? 'All enrolled students have a status ready to save.'
                      : `${unreadCount} student records are still pending for this date.`}
                </p>
                <button
                  type="submit"
                  disabled={isSaving || !selectedCourse || activeRoster.length === 0}
                  className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {isSaving ? 'Saving attendance...' : session ? 'Update session' : 'Save attendance'}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  )
}

export default AttendanceManagementPage
