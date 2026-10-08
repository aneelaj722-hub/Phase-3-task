import { type FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Teacher, TeacherInput, TeacherStatus } from './types'

type TeacherManagementPageProps = {
  teachers: Teacher[]
  storageError: string
  canManage: boolean
  onCreate: (input: TeacherInput) => Promise<void>
  onUpdate: (id: string, input: TeacherInput) => Promise<void>
  onStatusChange: (id: string, status: TeacherStatus) => Promise<void>
}

type StatusFilter = 'all' | TeacherStatus

const statusLabels: Record<TeacherStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

function normalizeCourseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((course) => course.trim())
        .filter(Boolean)
        .map((course) => course.replace(/\s+/g, ' ')),
    ),
  )
}

function TeacherManagementPage({
  teachers,
  storageError,
  canManage,
  onCreate,
  onUpdate,
  onStatusChange,
}: TeacherManagementPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const editingId = searchParams.get('edit')
  const editingTeacher = teachers.find((teacher) => teacher.id === editingId)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [teacherIdentifier, setTeacherIdentifier] = useState(editingTeacher?.teacherIdentifier ?? '')
  const [fullName, setFullName] = useState(editingTeacher?.fullName ?? '')
  const [email, setEmail] = useState(editingTeacher?.email ?? '')
  const [phone, setPhone] = useState(editingTeacher?.phone ?? '')
  const [specialization, setSpecialization] = useState(editingTeacher?.specialization ?? '')
  const [assignedCoursesText, setAssignedCoursesText] = useState(
    editingTeacher?.assignedCourses.join(', ') ?? '',
  )
  const [status, setStatus] = useState<TeacherStatus>(editingTeacher?.status ?? 'active')
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isFormOpen = isCreateFormOpen || Boolean(editingId)

  const filteredTeachers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return teachers
      .filter((teacher) => statusFilter === 'all' || teacher.status === statusFilter)
      .filter((teacher) => {
        if (!normalizedSearch) return true
        return [
          teacher.teacherIdentifier,
          teacher.fullName,
          teacher.email,
          teacher.phone,
          teacher.specialization,
          teacher.assignedCourses.join(' '),
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  }, [teachers, search, statusFilter])

  const resetForm = () => {
    setIsCreateFormOpen(false)
    setSearchParams({}, { replace: true })
    setTeacherIdentifier('')
    setFullName('')
    setEmail('')
    setPhone('')
    setSpecialization('')
    setAssignedCoursesText('')
    setStatus('active')
    setFormError('')
  }

  const openCreateForm = () => {
    if (!canManage) return
    setPageError('')
    setSearchParams({}, { replace: true })
    setTeacherIdentifier('')
    setFullName('')
    setEmail('')
    setPhone('')
    setSpecialization('')
    setAssignedCoursesText('')
    setStatus('active')
    setFormError('')
    setIsCreateFormOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPageError('')
    setFormError('')

    const input: TeacherInput = {
      teacherIdentifier: teacherIdentifier.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      specialization: specialization.trim(),
      assignedCourses: normalizeCourseList(assignedCoursesText),
      status,
    }

    if (
      editingTeacher &&
      input.status !== editingTeacher.status &&
      input.status !== 'active' &&
      !window.confirm(
        `Deactivate ${editingTeacher.fullName}? The teacher record and historical assignments will be retained.`,
      )
    ) {
      return
    }

    setIsSaving(true)

    try {
      if (editingId) {
        await onUpdate(editingId, input)
      } else {
        await onCreate(input)
      }
      resetForm()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this teacher record.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (teacher: Teacher, nextStatus: TeacherStatus) => {
    if (
      nextStatus !== 'active' &&
      !window.confirm(
        `Deactivate ${teacher.fullName}? The teacher record and course history will remain visible.`,
      )
    ) {
      return
    }

    setPageError('')
    try {
      await onStatusChange(teacher.id, nextStatus)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to update this teacher status.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Teacher management</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Teachers</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Search the teacher roster, keep course assignments current, and retain inactive records without losing history.
          </p>
        </div>
        <button
          type="button"
          onClick={isCreateFormOpen ? resetForm : openCreateForm}
          disabled={!canManage}
          className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreateFormOpen ? 'Cancel' : 'Add teacher'}
        </button>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Teacher records are stored in Supabase and protected by database access policies.
      </p>

      {!canManage ? (
        <p className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          Teacher records are viewable here, but only an active administrator can create, edit, or deactivate them.
        </p>
      ) : null}

      {storageError ? (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {storageError}
        </p>
      ) : null}
      {pageError ? (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {pageError}
        </p>
      ) : null}

      {isFormOpen ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? 'Edit teacher' : 'Create teacher'}
          </h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="teacher-identifier" className="mb-2 block text-sm font-medium text-slate-200">
                Teacher identifier
              </label>
              <input
                id="teacher-identifier"
                required
                maxLength={40}
                autoComplete="off"
                value={teacherIdentifier}
                onChange={(event) => setTeacherIdentifier(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="teacher-name" className="mb-2 block text-sm font-medium text-slate-200">
                Full name
              </label>
              <input
                id="teacher-name"
                required
                maxLength={120}
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="teacher-email" className="mb-2 block text-sm font-medium text-slate-200">
                Email address <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="teacher-email"
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="teacher-phone" className="mb-2 block text-sm font-medium text-slate-200">
                Phone number <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="teacher-phone"
                type="tel"
                maxLength={40}
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="teacher-specialization" className="mb-2 block text-sm font-medium text-slate-200">
                Specialization <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="teacher-specialization"
                maxLength={150}
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                placeholder="Mathematics, English, Biology"
              />
            </div>
            {editingId ? (
              <div>
                <label htmlFor="teacher-status" className="mb-2 block text-sm font-medium text-slate-200">
                  Status
                </label>
                <select
                  id="teacher-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TeacherStatus)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <label htmlFor="teacher-courses" className="mb-2 block text-sm font-medium text-slate-200">
                Assigned courses
              </label>
              <textarea
                id="teacher-courses"
                value={assignedCoursesText}
                onChange={(event) => setAssignedCoursesText(event.target.value)}
                rows={3}
                placeholder="MAT101, ENG205, BIO110"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
              <p className="mt-2 text-xs text-slate-400">
                Add course codes or names separated by commas or new lines. Historical assignments remain visible even when a teacher is inactive.
              </p>
            </div>
            {formError ? (
              <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 md:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isSaving || Boolean(storageError) || !canManage}
                className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create teacher'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Teacher directory</h2>
            <p className="mt-1 text-sm text-slate-400">{filteredTeachers.length} matching teacher(s)</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div>
              <label htmlFor="teacher-search" className="sr-only">
                Search teachers by name, identifier, email, phone, or course
              </label>
              <input
                id="teacher-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search teachers"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="teacher-status-filter" className="sr-only">
                Filter teachers by status
              </label>
              <select
                id="teacher-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {filteredTeachers.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-3 py-3 font-medium">Teacher</th>
                  <th scope="col" className="px-3 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-3 py-3 font-medium">Specialization</th>
                  <th scope="col" className="px-3 py-3 font-medium">Assigned courses</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="align-top text-slate-200">
                    <td className="px-3 py-4">
                      <Link
                        to={`/teachers/${teacher.id}`}
                        className="font-medium text-white underline decoration-slate-600 underline-offset-4 hover:text-sky-300"
                      >
                        {teacher.fullName}
                      </Link>
                      <p className="mt-1 text-slate-400">{teacher.teacherIdentifier}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-300">
                      {teacher.email ? <p>{teacher.email}</p> : null}
                      {teacher.phone ? <p className={teacher.email ? 'mt-1' : ''}>{teacher.phone}</p> : null}
                      {!teacher.email && !teacher.phone ? <span className="text-slate-500">Not provided</span> : null}
                    </td>
                    <td className="px-3 py-4 text-slate-300">
                      {teacher.specialization || <span className="text-slate-500">Not specified</span>}
                    </td>
                    <td className="px-3 py-4 text-slate-300">
                      {teacher.assignedCourses.length ? (
                        <div className="flex flex-wrap gap-2">
                          {teacher.assignedCourses.map((course) => (
                            <span key={`${teacher.id}-${course}`} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">
                              {course}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">No courses assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          teacher.status === 'active'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-600 bg-slate-800 text-slate-300'
                        }`}
                      >
                        {statusLabels[teacher.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {canManage ? (
                        <div className="flex flex-col gap-2">
                          <Link
                            to={`/teachers?edit=${encodeURIComponent(teacher.id)}`}
                            className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white"
                          >
                            Edit
                          </Link>
                          <select
                            aria-label={`Status for ${teacher.fullName}`}
                            value={teacher.status}
                            onChange={(event) => void handleStatusChange(teacher, event.target.value as TeacherStatus)}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-sky-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      ) : (
                        <Link
                          to={`/teachers/${teacher.id}`}
                          className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-400">
            No teacher records match the current filters.
          </div>
        )}
      </section>
    </div>
  )
}

export default TeacherManagementPage
