import { type FormEvent, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { Course, Enrollment, EnrollmentInput, EnrollmentStatus } from './types'

type CourseDetailPageProps = {
  courses: Course[]
  teachers: { id: string; fullName: string; status: 'active' | 'inactive' }[]
  students: { id: string; fullName: string; status: 'active' | 'inactive' | 'withdrawn'; studentIdentifier: string }[]
  enrollments: Enrollment[]
  canManage: boolean
  onEnroll: (input: EnrollmentInput) => Promise<void>
  onStatusChange: (id: string, status: EnrollmentStatus) => Promise<void>
}

const statusStyles = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  archived: 'border-slate-600 bg-slate-800 text-slate-300',
}

function CourseDetailPage({
  courses,
  teachers,
  students,
  enrollments,
  canManage,
  onEnroll,
  onStatusChange,
}: CourseDetailPageProps) {
  const { courseId } = useParams()
  const course = courses.find((entry) => entry.id === courseId)
  const [studentId, setStudentId] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const roster = useMemo(
    () =>
      enrollments
        .filter((entry) => entry.courseId === course?.id && entry.status === 'active')
        .map((entry) => {
          const student = students.find((candidate) => candidate.id === entry.studentId)
          return {
            ...entry,
            student,
          }
        })
        .filter((entry) => entry.student),
    [course?.id, enrollments, students],
  )

  const availableStudents = students.filter(
    (student) => student.status === 'active' && !roster.some((entry) => entry.studentId === student.id),
  )

  if (!course) {
    return <Navigate to="/courses" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (!studentId) {
      setFormError('Choose a student to enroll.')
      return
    }

    setIsSaving(true)
    try {
      await onEnroll({ studentId, courseId: course.id, status: 'active' })
      setStudentId('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to enroll the student.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/courses" className="inline-flex text-sm font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white">
        ← Back to courses
      </Link>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Course record</p>
            <h1 className="mt-3 text-3xl font-bold text-white">{course.title}</h1>
            <p className="mt-2 text-slate-300">{course.courseCode} · {course.credits} credits</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[course.status]}`}>
              {course.status}
            </span>
            {canManage ? (
              <Link to={`/courses?edit=${encodeURIComponent(course.id)}`} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white">
                Edit course
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Course details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Code</dt>
              <dd className="mt-1 text-slate-200">{course.courseCode}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Description</dt>
              <dd className="mt-1 text-slate-200">{course.description || 'No description provided.'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Credits</dt>
              <dd className="mt-1 text-slate-200">{course.credits}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Assigned teachers</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {course.teacherIds.length ? (
              course.teacherIds.map((teacherId) => {
                const teacher = teachers.find((entry) => entry.id === teacherId)
                return (
                  <span key={`${course.id}-${teacherId}`} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                    {teacher?.fullName ?? 'Unknown teacher'}
                  </span>
                )
              })
            ) : (
              <span className="text-slate-500">No teachers assigned.</span>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Course roster</h2>
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
            {roster.length} active students
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            {roster.length ? (
              <ul className="space-y-3">
                {roster.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-200">
                    <div>
                      <p className="font-medium text-white">{entry.student?.fullName ?? 'Student record'}</p>
                      <p className="text-slate-400">{entry.student?.studentIdentifier ?? 'Unknown identifier'}</p>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => void onStatusChange(entry.id, 'withdrawn')}
                        className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-500 hover:text-white"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
                No active students are enrolled in this course yet.
              </div>
            )}
          </div>

          {canManage ? (
            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-base font-semibold text-white">Enroll student</h3>
              <label htmlFor="enroll-student" className="mt-4 mb-2 block text-sm font-medium text-slate-200">Student</label>
              <select
                id="enroll-student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="">Select a student</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>{student.fullName}</option>
                ))}
              </select>

              {formError ? (
                <p role="alert" className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSaving || !studentId}
                className="mt-4 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Enroll student'}
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Historical enrollments and archived course records remain visible so past activity remains traceable.
      </p>
    </div>
  )
}

export default CourseDetailPage
