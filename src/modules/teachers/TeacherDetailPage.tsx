import { Link, Navigate, useParams } from 'react-router-dom'
import type { Teacher } from './types'

type TeacherDetailPageProps = {
  teachers: Teacher[]
  canManage: boolean
}

const statusStyles = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  inactive: 'border-slate-600 bg-slate-800 text-slate-300',
}

function TeacherDetailPage({ teachers, canManage }: TeacherDetailPageProps) {
  const { teacherId } = useParams()
  const teacher = teachers.find((entry) => entry.id === teacherId)

  if (!teacher) {
    return <Navigate to="/teachers" replace />
  }

  return (
    <div className="space-y-6">
      <Link
        to="/teachers"
        className="inline-flex text-sm font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white"
      >
        ← Back to teachers
      </Link>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Teacher record</p>
            <h1 className="mt-3 text-3xl font-bold text-white">{teacher.fullName}</h1>
            <p className="mt-2 text-slate-300">Identifier: {teacher.teacherIdentifier}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[teacher.status]}`}>
              {teacher.status}
            </span>
            {canManage ? (
              <Link
                to={`/teachers?edit=${encodeURIComponent(teacher.id)}`}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
              >
                Edit teacher
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Contact details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd className="mt-1 text-slate-200">{teacher.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Phone</dt>
              <dd className="mt-1 text-slate-200">{teacher.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Specialization</dt>
              <dd className="mt-1 text-slate-200">{teacher.specialization || 'Not specified'}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Assigned courses</h2>
          {teacher.assignedCourses.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {teacher.assignedCourses.map((course) => (
                <li
                  key={`${teacher.id}-${course}`}
                  className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200"
                >
                  {course}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
              No course assignments are recorded for this teacher.
            </div>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">History and status note</h2>
        <p className="mt-3 text-sm text-slate-300">
          This teacher record remains visible in the directory even when inactive, so historical course assignments continue to be traceable.
        </p>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Teacher records are stored in Supabase and protected by database access policies.
      </p>
    </div>
  )
}

export default TeacherDetailPage
