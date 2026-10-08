import { type FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Course, CourseInput, CourseStatus, EnrollmentStatus } from './types'

type CourseManagementPageProps = {
  courses: Course[]
  teachers: { id: string; fullName: string; status: 'active' | 'inactive' }[]
  students: { id: string; fullName: string; status: 'active' | 'inactive' | 'withdrawn' }[]
  enrollments: { id: string; courseId: string; studentId: string; status: EnrollmentStatus }[]
  storageError: string
  canManage: boolean
  onCreate: (input: CourseInput) => Promise<void>
  onUpdate: (id: string, input: CourseInput) => Promise<void>
  onStatusChange: (id: string, status: CourseStatus) => Promise<void>
}

type StatusFilter = 'all' | CourseStatus

const statusLabels: Record<CourseStatus, string> = {
  active: 'Active',
  archived: 'Archived',
}

function CourseManagementPage({
  courses,
  teachers,
  students,
  enrollments,
  storageError,
  canManage,
  onCreate,
  onUpdate,
  onStatusChange,
}: CourseManagementPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const editingId = searchParams.get('edit')
  const editingCourse = courses.find((course) => course.id === editingId)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [courseCode, setCourseCode] = useState(editingCourse?.courseCode ?? '')
  const [title, setTitle] = useState(editingCourse?.title ?? '')
  const [description, setDescription] = useState(editingCourse?.description ?? '')
  const [credits, setCredits] = useState(String(editingCourse?.credits ?? 1))
  const [status, setStatus] = useState<CourseStatus>(editingCourse?.status ?? 'active')
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(editingCourse?.teacherIds ?? [])
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isFormOpen = isCreateFormOpen || Boolean(editingId)

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return courses
      .filter((course) => statusFilter === 'all' || course.status === statusFilter)
      .filter((course) => {
        if (!normalizedSearch) return true
        return [course.courseCode, course.title, course.description, course.teacherIds.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .sort((left, right) => left.title.localeCompare(right.title))
  }, [courses, search, statusFilter])

  const activeTeacherOptions = teachers.filter((teacher) => teacher.status === 'active')
  const activeStudentCount = (course: Course) =>
    students.filter(
      (student) =>
        student.status === 'active' &&
        enrollments.some(
          (enrollment) =>
            enrollment.courseId === course.id &&
            enrollment.studentId === student.id &&
            enrollment.status === 'active',
        ),
    ).length

  const resetForm = () => {
    setIsCreateFormOpen(false)
    setSearchParams({}, { replace: true })
    setCourseCode('')
    setTitle('')
    setDescription('')
    setCredits('1')
    setStatus('active')
    setSelectedTeacherIds([])
    setFormError('')
  }

  const openCreateForm = () => {
    if (!canManage) return
    setPageError('')
    setSearchParams({}, { replace: true })
    setCourseCode('')
    setTitle('')
    setDescription('')
    setCredits('1')
    setStatus('active')
    setSelectedTeacherIds([])
    setFormError('')
    setIsCreateFormOpen(true)
  }

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds((current) =>
      current.includes(teacherId)
        ? current.filter((entry) => entry !== teacherId)
        : [...current, teacherId],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPageError('')
    setFormError('')

    const validatedCredits = Number.parseFloat(credits)
    if (!Number.isFinite(validatedCredits) || validatedCredits <= 0) {
      setFormError('Credits must be greater than zero.')
      return
    }

    const input: CourseInput = {
      courseCode: courseCode.trim(),
      title: title.trim(),
      description: description.trim(),
      credits: validatedCredits,
      teacherIds: selectedTeacherIds,
      status,
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
      setFormError(error instanceof Error ? error.message : 'Unable to save this course.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (course: Course, nextStatus: CourseStatus) => {
    if (
      nextStatus !== 'active' &&
      !window.confirm(`Archive ${course.title}? The historical course record will remain visible.`)
    ) {
      return
    }

    setPageError('')
    try {
      await onStatusChange(course.id, nextStatus)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to update this course status.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Course management</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Courses</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Search courses, assign teachers, and keep the active roster aligned with current enrollment status.
          </p>
        </div>
        <button
          type="button"
          onClick={isCreateFormOpen ? resetForm : openCreateForm}
          disabled={!canManage}
          className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreateFormOpen ? 'Cancel' : 'Add course'}
        </button>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Course and enrollment records are stored in Supabase and protected by database access policies.
      </p>

      {!canManage ? (
        <p className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          Course records are viewable here, but only an active administrator can create, edit, or archive them.
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
          <h2 className="text-xl font-semibold text-white">{editingId ? 'Edit course' : 'Create course'}</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="course-code" className="mb-2 block text-sm font-medium text-slate-200">Course code</label>
              <input
                id="course-code"
                required
                maxLength={30}
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="course-title" className="mb-2 block text-sm font-medium text-slate-200">Course title</label>
              <input
                id="course-title"
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="course-description" className="mb-2 block text-sm font-medium text-slate-200">Description</label>
              <textarea
                id="course-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="course-credits" className="mb-2 block text-sm font-medium text-slate-200">Credits</label>
              <input
                id="course-credits"
                type="number"
                min="1"
                step="1"
                value={credits}
                onChange={(event) => setCredits(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            {editingId ? (
              <div>
                <label htmlFor="course-status" className="mb-2 block text-sm font-medium text-slate-200">Status</label>
                <select
                  id="course-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as CourseStatus)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-200">Assigned teachers</p>
              <div className="grid gap-2 md:grid-cols-2">
                {activeTeacherOptions.length ? (
                  activeTeacherOptions.map((teacher) => (
                    <label key={teacher.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.includes(teacher.id)}
                        onChange={() => toggleTeacher(teacher.id)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                      />
                      {teacher.fullName}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No active teachers are available to assign yet.</p>
                )}
              </div>
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
                {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create course'}
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
            <h2 className="text-xl font-semibold text-white">Course directory</h2>
            <p className="mt-1 text-sm text-slate-400">{filteredCourses.length} matching course(s)</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div>
              <label htmlFor="course-search" className="sr-only">Search courses</label>
              <input
                id="course-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search courses"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="course-status-filter" className="sr-only">Filter by status</label>
              <select
                id="course-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {filteredCourses.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-3 py-3 font-medium">Course</th>
                  <th scope="col" className="px-3 py-3 font-medium">Teachers</th>
                  <th scope="col" className="px-3 py-3 font-medium">Credits</th>
                  <th scope="col" className="px-3 py-3 font-medium">Roster</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="align-top text-slate-200">
                    <td className="px-3 py-4">
                      <Link to={`/courses/${course.id}`} className="font-medium text-white underline decoration-slate-600 underline-offset-4 hover:text-sky-300">
                        {course.title}
                      </Link>
                      <p className="mt-1 text-slate-400">{course.courseCode}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-300">
                      {course.teacherIds.length ? (
                        <div className="flex flex-wrap gap-2">
                          {course.teacherIds.map((teacherId) => {
                            const teacher = teachers.find((entry) => entry.id === teacherId)
                            return (
                              <span key={`${course.id}-${teacherId}`} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">
                                {teacher?.fullName ?? 'Unknown teacher'}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-500">No teachers assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-slate-300">{course.credits}</td>
                    <td className="px-3 py-4 text-slate-300">{activeStudentCount(course)}</td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${course.status === 'active' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-800 text-slate-300'}`}>
                        {statusLabels[course.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {canManage ? (
                        <div className="flex flex-col gap-2">
                          <Link to={`/courses?edit=${encodeURIComponent(course.id)}`} className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white">Edit</Link>
                          <select
                            aria-label={`Status for ${course.title}`}
                            value={course.status}
                            onChange={(event) => void handleStatusChange(course, event.target.value as CourseStatus)}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-sky-500"
                          >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      ) : (
                        <Link to={`/courses/${course.id}`} className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-white">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-400">
            No course records match the current filters.
          </div>
        )}
      </section>
    </div>
  )
}

export default CourseManagementPage
