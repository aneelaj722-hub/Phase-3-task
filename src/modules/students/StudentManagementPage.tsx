import { type FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Student, StudentInput, StudentStatus } from './types'

type StudentManagementPageProps = {
  students: Student[]
  storageError: string
  onCreate: (input: StudentInput) => Promise<void>
  onUpdate: (id: string, input: StudentInput) => Promise<void>
  onStatusChange: (id: string, status: StudentStatus) => Promise<void>
}

type StatusFilter = 'all' | StudentStatus

const statusLabels: Record<StudentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  withdrawn: 'Withdrawn',
}

function getLocalDateValue() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function StudentManagementPage({
  students,
  storageError,
  onCreate,
  onUpdate,
  onStatusChange,
}: StudentManagementPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const editingId = searchParams.get('edit')
  const editingStudent = students.find((student) => student.id === editingId)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [studentIdentifier, setStudentIdentifier] = useState(editingStudent?.studentIdentifier ?? '')
  const [fullName, setFullName] = useState(editingStudent?.fullName ?? '')
  const [email, setEmail] = useState(editingStudent?.email ?? '')
  const [phone, setPhone] = useState(editingStudent?.phone ?? '')
  const [enrollmentDate, setEnrollmentDate] = useState(editingStudent?.enrollmentDate ?? getLocalDateValue())
  const [status, setStatus] = useState<StudentStatus>(editingStudent?.status ?? 'active')
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isFormOpen = isCreateFormOpen || Boolean(editingId)

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return students
      .filter((student) => statusFilter === 'all' || student.status === statusFilter)
      .filter((student) => {
        if (!normalizedSearch) return true
        return [
          student.studentIdentifier,
          student.fullName,
          student.email,
          student.phone,
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  }, [students, search, statusFilter])

  const resetForm = () => {
    setIsCreateFormOpen(false)
    setSearchParams({}, { replace: true })
    setStudentIdentifier('')
    setFullName('')
    setEmail('')
    setPhone('')
    setEnrollmentDate(getLocalDateValue())
    setStatus('active')
    setFormError('')
  }

  const openCreateForm = () => {
    setPageError('')
    setSearchParams({}, { replace: true })
    setStudentIdentifier('')
    setFullName('')
    setEmail('')
    setPhone('')
    setEnrollmentDate(getLocalDateValue())
    setStatus('active')
    setFormError('')
    setIsCreateFormOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPageError('')
    setFormError('')

    const input: StudentInput = {
      studentIdentifier: studentIdentifier.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      enrollmentDate,
      status,
    }
    if (
      editingStudent &&
      input.status !== editingStudent.status &&
      input.status !== 'active' &&
      !window.confirm(
        `${input.status === 'withdrawn' ? 'Withdraw' : 'Mark inactive'} ${editingStudent.fullName}? The student record and related history will be retained.`,
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
      setFormError(error instanceof Error ? error.message : 'Unable to save this student record.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (student: Student, nextStatus: StudentStatus) => {
    if (
      nextStatus !== 'active' &&
      !window.confirm(
        `${nextStatus === 'withdrawn' ? 'Withdraw' : 'Mark inactive'} ${student.fullName}? The student record and related history will be retained.`,
      )
    ) {
      return
    }

    setPageError('')
    try {
      await onStatusChange(student.id, nextStatus)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to update this student status.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Student management</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Students</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Search the student directory, keep contact details current, and retain inactive or withdrawn records.
          </p>
        </div>
        <button
          type="button"
          onClick={isCreateFormOpen ? resetForm : openCreateForm}
          className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          {isCreateFormOpen ? 'Cancel' : 'Add student'}
        </button>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Student records are stored in Supabase and protected by database access policies.
      </p>

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
            {editingId ? 'Edit student' : 'Create student'}
          </h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="student-identifier" className="mb-2 block text-sm font-medium text-slate-200">
                Student identifier
              </label>
              <input
                id="student-identifier"
                required
                maxLength={40}
                autoComplete="off"
                value={studentIdentifier}
                onChange={(event) => setStudentIdentifier(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="student-name" className="mb-2 block text-sm font-medium text-slate-200">
                Full name
              </label>
              <input
                id="student-name"
                required
                maxLength={120}
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="student-email" className="mb-2 block text-sm font-medium text-slate-200">
                Email address <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="student-email"
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="student-phone" className="mb-2 block text-sm font-medium text-slate-200">
                Phone number <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="student-phone"
                type="tel"
                maxLength={40}
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="student-enrollment-date" className="mb-2 block text-sm font-medium text-slate-200">
                Enrollment date
              </label>
              <input
                id="student-enrollment-date"
                type="date"
                required
                value={enrollmentDate}
                onChange={(event) => setEnrollmentDate(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            {editingId ? (
              <div>
                <label htmlFor="student-status" className="mb-2 block text-sm font-medium text-slate-200">
                  Status
                </label>
                <select
                  id="student-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StudentStatus)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            ) : null}
            {formError ? (
              <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 md:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isSaving || Boolean(storageError)}
                className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create student'}
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
            <h2 className="text-xl font-semibold text-white">Student directory</h2>
            <p className="mt-1 text-sm text-slate-400">{filteredStudents.length} matching student(s)</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div>
              <label htmlFor="student-search" className="sr-only">
                Search students by name, identifier, email, or phone
              </label>
              <input
                id="student-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="student-status-filter" className="sr-only">
                Filter students by status
              </label>
              <select
                id="student-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>

        {filteredStudents.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-3 py-3 font-medium">Student</th>
                  <th scope="col" className="px-3 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-3 py-3 font-medium">Enrolled</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="align-top text-slate-200">
                    <td className="px-3 py-4">
                      <Link
                        to={`/students/${student.id}`}
                        className="font-medium text-white underline decoration-slate-600 underline-offset-4 hover:text-sky-300"
                      >
                        {student.fullName}
                      </Link>
                      <p className="mt-1 text-slate-400">{student.studentIdentifier}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-300">
                      {student.email ? <p>{student.email}</p> : null}
                      {student.phone ? <p className={student.email ? 'mt-1' : ''}>{student.phone}</p> : null}
                      {!student.email && !student.phone ? <span className="text-slate-500">Not provided</span> : null}
                    </td>
                    <td className="px-3 py-4">{formatDate(student.enrollmentDate)}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          student.status === 'active'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : student.status === 'withdrawn'
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-slate-600 bg-slate-800 text-slate-300'
                        }`}
                      >
                        {statusLabels[student.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/students?edit=${encodeURIComponent(student.id)}`}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={Boolean(storageError)}
                          onClick={() =>
                            void handleStatusChange(
                              student,
                              student.status === 'active' ? 'inactive' : 'active',
                            )
                          }
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {student.status === 'active' ? 'Mark inactive' : 'Reactivate'}
                        </button>
                        {student.status !== 'withdrawn' ? (
                          <button
                            type="button"
                            disabled={Boolean(storageError)}
                            onClick={() => void handleStatusChange(student, 'withdrawn')}
                            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Withdraw
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
            <p className="font-medium text-slate-200">
              {students.length ? 'No students match these filters.' : 'No students have been added yet.'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {students.length ? 'Try another search or status filter.' : 'Add a student to start the directory.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default StudentManagementPage
