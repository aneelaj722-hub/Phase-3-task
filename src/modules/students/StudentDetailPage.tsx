import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { AttendanceEntry, AttendanceSession } from '../attendance/types'
import type { Course, Enrollment } from '../courses/types'
import type { FeeObligation, FeePayment } from '../fees/types'
import type { Student } from './types'

type StudentDetailPageProps = {
  students: Student[]
  courses: Course[]
  enrollments: Enrollment[]
  attendanceSessions: AttendanceSession[]
  attendanceEntries: AttendanceEntry[]
  canViewAttendance: boolean
  obligations: FeeObligation[]
  payments: FeePayment[]
}

const statusStyles = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  inactive: 'border-slate-600 bg-slate-800 text-slate-300',
  withdrawn: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

const enrollmentStatusStyles = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  withdrawn: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  completed: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
}

const attendanceStatusStyles = {
  present: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  absent: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  late: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
}

function StudentDetailPage({
  students,
  courses,
  enrollments,
  attendanceSessions,
  attendanceEntries,
  canViewAttendance,
  obligations,
  payments,
}: StudentDetailPageProps) {
  const { studentId } = useParams()
  const student = students.find((entry) => entry.id === studentId)
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10))

  const studentEnrollments = useMemo(
    () =>
      student
        ? enrollments
            .filter((entry) => entry.studentId === student.id)
            .sort((left, right) => right.enrolledAt.localeCompare(left.enrolledAt))
        : [],
    [enrollments, student],
  )
  const studentAttendance = useMemo(() => {
    if (!student || !canViewAttendance) return []

    const sessionsById = new Map(attendanceSessions.map((session) => [session.id, session]))
    return attendanceEntries
      .filter((entry) => entry.studentId === student.id)
      .flatMap((entry) => {
        const session = sessionsById.get(entry.sessionId)
        if (!session) return []
        return [{ entry, session }]
      })
      .sort((left, right) => right.session.sessionDate.localeCompare(left.session.sessionDate))
  }, [attendanceEntries, attendanceSessions, canViewAttendance, student])

  const studentObligations = useMemo(
    () => student
      ? obligations.filter((entry) => entry.studentId === student.id && entry.status !== 'cancelled')
      : [],
    [obligations, student],
  )
  const studentPayments = useMemo(
    () => student
      ? payments.filter((entry) => entry.studentId === student.id && entry.status === 'posted')
      : [],
    [payments, student],
  )
  const totalObligations = studentObligations.reduce((total, entry) => total + entry.amount, 0)
  const totalPayments = studentPayments.reduce((total, entry) => total + entry.amount, 0)
  const outstandingBalance = studentObligations.reduce(
    (total, entry) => total + entry.remainingBalance,
    0,
  )
  const recentPayments = useMemo(
    () =>
      [...studentPayments].sort(
        (left, right) => new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime(),
      ),
    [studentPayments],
  )

  const overdueCount = studentObligations.filter(
    (entry) => entry.status === 'open' && entry.dueDate < todayIso,
  ).length

  if (!student) {
    return <Navigate to="/students" replace />
  }

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="inline-flex text-sm font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white"
      >
        ← Back to students
      </Link>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Student record</p>
            <h1 className="mt-3 text-3xl font-bold text-white">{student.fullName}</h1>
            <p className="mt-2 text-slate-300">Identifier: {student.studentIdentifier}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[student.status]}`}>
              {student.status}
            </span>
            <Link
              to={`/students?edit=${encodeURIComponent(student.id)}`}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
            >
              Edit student
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Contact details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd className="mt-1 text-slate-200">{student.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Phone</dt>
              <dd className="mt-1 text-slate-200">{student.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Enrollment date</dt>
              <dd className="mt-1 text-slate-200">{student.enrollmentDate}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Course enrollments</h2>
          {studentEnrollments.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {studentEnrollments.map((enrollment) => {
                const course = courses.find((entry) => entry.id === enrollment.courseId)
                return (
                  <li key={enrollment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div>
                      <p className="font-medium text-white">{course?.title ?? 'Course record unavailable'}</p>
                      <p className="text-xs text-slate-400">
                        {course?.courseCode ?? 'Unknown course'} · Enrolled {enrollment.enrolledAt.slice(0, 10)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${enrollmentStatusStyles[enrollment.status]}`}>
                      {enrollment.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
              No course enrollment records are available for this student.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Attendance history</h2>
          {!canViewAttendance ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
              Attendance history is restricted to authorized staff.
            </div>
          ) : studentAttendance.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {studentAttendance.map(({ entry, session }) => {
                const course = courses.find((item) => item.id === session.courseId)
                return (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div>
                      <p className="font-medium text-white">{course?.title ?? 'Course record unavailable'}</p>
                      <p className="text-xs text-slate-400">
                        {course?.courseCode ?? 'Unknown course'} · {session.sessionDate}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceStatusStyles[entry.status]}`}>
                      {entry.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
              No attendance history is available for this student.
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Fee summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total obligations</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(totalObligations)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Payments made</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(totalPayments)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
              <p className={`mt-2 text-2xl font-bold ${outstandingBalance > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
                {formatCurrency(outstandingBalance)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Overdue</p>
              <p className="mt-2 text-2xl font-bold text-white">{overdueCount}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {studentObligations.length ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Open obligations</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {studentObligations.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                      <div>
                        <p className="font-medium text-white">{entry.description}</p>
                        <p className="text-xs text-slate-400">Due {entry.dueDate}</p>
                      </div>
                      <span className="font-semibold text-slate-100">{formatCurrency(entry.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                No fee obligations have been recorded for this student yet.
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {recentPayments.length ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Recent payments</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {recentPayments.slice(0, 4).map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                      <div>
                        <p className="font-medium text-white">{entry.reference}</p>
                        <p className="text-xs text-slate-400">{entry.method} · {entry.paymentDate}</p>
                      </div>
                      <span className={`font-semibold ${entry.reviewRequired ? 'text-amber-200' : 'text-emerald-200'}`}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                No payment history is available for this student yet.
              </div>
            )}
          </div>
        </article>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Student records are stored in Supabase and protected by database access policies.
      </p>
    </div>
  )
}

export default StudentDetailPage
