import { type FormEvent, useMemo, useState } from 'react'
import type { Role, StaffProfile, StaffProfileInput, StaffStatus } from './types'

type StaffManagementPageProps = {
  profiles: StaffProfile[]
  currentProfileId: string
  onCreate: (input: StaffProfileInput) => Promise<void>
  onUpdate: (id: string, input: StaffProfileInput) => Promise<void>
  onStatusChange: (id: string, status: StaffStatus) => Promise<void>
}

type StatusFilter = 'all' | StaffStatus

const roleLabels: Record<Role, string> = {
  administrator: 'Administrator',
  teacher: 'Teacher',
  finance: 'Finance',
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function StaffManagementPage({
  profiles,
  currentProfileId,
  onCreate,
  onUpdate,
  onStatusChange,
}: StaffManagementPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('teacher')
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return profiles
      .filter((entry) => statusFilter === 'all' || entry.status === statusFilter)
      .filter(
        (entry) =>
          !normalizedSearch ||
          entry.fullName.toLowerCase().includes(normalizedSearch) ||
          entry.email.toLowerCase().includes(normalizedSearch),
      )
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  }, [profiles, search, statusFilter])

  const resetForm = () => {
    setEditingId(null)
    setFullName('')
    setEmail('')
    setRole('teacher')
    setFormError('')
    setIsFormOpen(false)
  }

  const openCreateForm = () => {
    setPageError('')
    setEditingId(null)
    setFullName('')
    setEmail('')
    setRole('teacher')
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (staffProfile: StaffProfile) => {
    setPageError('')
    setEditingId(staffProfile.id)
    setFullName(staffProfile.fullName)
    setEmail(staffProfile.email)
    setRole(staffProfile.role)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setPageError('')
    setIsSaving(true)

    try {
      const input = { fullName: fullName.trim(), email: email.trim(), role }
      if (editingId) {
        await onUpdate(editingId, input)
      } else {
        await onCreate(input)
      }
      resetForm()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this staff profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (staffProfile: StaffProfile) => {
    const nextStatus = staffProfile.status === 'active' ? 'inactive' : 'active'
    if (
      nextStatus === 'inactive' &&
      !window.confirm(`Deactivate ${staffProfile.fullName}? Their profile history will be retained.`)
    ) {
      return
    }

    setPageError('')
    try {
      await onStatusChange(staffProfile.id, nextStatus)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to update this staff status.')
    }
  }

  const activeCount = profiles.filter((entry) => entry.status === 'active').length
  const inactiveCount = profiles.length - activeCount

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Administration</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Staff profiles</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Manage staff details, application roles, and profile status. Inactive profiles remain available
            for audit history.
          </p>
        </div>
        <button
          type="button"
          onClick={isFormOpen && !editingId ? resetForm : openCreateForm}
          className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          {isFormOpen && !editingId ? 'Cancel' : 'Add staff member'}
        </button>
      </section>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Staff profiles are provisioned through Supabase Auth invitations. Database policies enforce access by role.
      </p>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Active staff</p>
          <p className="mt-3 text-3xl font-bold text-white">{activeCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Inactive staff</p>
          <p className="mt-3 text-3xl font-bold text-white">{inactiveCount}</p>
        </article>
      </section>

      {isFormOpen ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? 'Edit staff profile' : 'Create staff profile'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {editingId
              ? 'Update the staff member’s details and assigned role.'
              : 'Add a profile to the local demo directory. This does not create a Supabase Auth account.'}
          </p>

          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="staff-full-name" className="mb-2 block text-sm font-medium text-slate-200">
                Full name
              </label>
              <input
                id="staff-full-name"
                autoComplete="name"
                required
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="staff-email" className="mb-2 block text-sm font-medium text-slate-200">
                Business email
              </label>
              <input
                id="staff-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="staff-role" className="mb-2 block text-sm font-medium text-slate-200">
                Role
              </label>
              <select
                id="staff-role"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="administrator">Administrator</option>
                <option value="teacher">Teacher</option>
                <option value="finance">Finance</option>
              </select>
            </div>

            {formError ? (
              <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 md:col-span-2">
                {formError}
              </p>
            ) : null}

            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create profile'}
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

      {pageError ? (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {pageError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Directory</h2>
            <p className="mt-1 text-sm text-slate-400">{filteredProfiles.length} matching profile(s)</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div>
              <label htmlFor="staff-search" className="sr-only">
                Search staff by name or email
              </label>
              <input
                id="staff-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label htmlFor="staff-status-filter" className="sr-only">
                Filter by staff status
              </label>
              <select
                id="staff-status-filter"
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

        {filteredProfiles.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-3 py-3 font-medium">Staff member</th>
                  <th scope="col" className="px-3 py-3 font-medium">Role</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Created / updated</th>
                  <th scope="col" className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProfiles.map((entry) => (
                  <tr key={entry.id} className="align-top text-slate-200">
                    <td className="px-3 py-4">
                      <p className="font-medium text-white">{entry.fullName}</p>
                      <p className="mt-1 text-slate-400">{entry.email}</p>
                      {entry.id === currentProfileId ? (
                        <span className="mt-2 inline-block text-xs text-sky-300">You</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">{roleLabels[entry.role]}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          entry.status === 'active'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-600 bg-slate-800 text-slate-300'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-400">
                      <p>Created {formatDate(entry.createdAt)}</p>
                      <p className="mt-1">
                        By {profiles.find((actor) => actor.id === entry.createdBy)?.fullName ?? entry.createdBy ?? 'Legacy record'}
                      </p>
                      <p className="mt-2">Updated {formatDate(entry.updatedAt)}</p>
                      <p className="mt-1">
                        By {profiles.find((actor) => actor.id === entry.updatedBy)?.fullName ?? entry.updatedBy ?? 'Legacy record'}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(entry)}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(entry)}
                          disabled={entry.id === currentProfileId && entry.status === 'active'}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {entry.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
            <p className="font-medium text-slate-200">No staff profiles match these filters.</p>
            <p className="mt-1 text-sm text-slate-400">Try another search or status filter.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default StaffManagementPage
