import { type FormEvent, createContext, useContext, useEffect, useMemo, useState } from 'react'
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

type Role = 'administrator' | 'teacher' | 'finance'
type StaffStatus = 'active' | 'inactive'

type StaffProfile = {
  id: string
  email: string
  fullName: string
  role: Role
  status: StaffStatus
  createdAt: string
  updatedAt: string
}

type SessionUser = {
  id: string
  email: string
  authenticatedAt: string
}

type StaffProfileInput = {
  fullName: string
  email: string
  role: Role
}

type AuthContextValue = {
  session: SessionUser | null
  profile: StaffProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createProfile: (payload: StaffProfileInput) => Promise<void>
}

const PROFILE_STORAGE_KEY = 'academy_staff_profiles'
const SESSION_STORAGE_KEY = 'academy_current_session'
const DEFAULT_PASSWORD = 'academy123'

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `staff-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readProfiles(): StaffProfile[] {
  const saved = window.localStorage.getItem(PROFILE_STORAGE_KEY)

  if (!saved) {
    const seedProfile: StaffProfile = {
      id: 'seed-admin',
      email: 'admin@academy.local',
      fullName: 'Academy Admin',
      role: 'administrator',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify([seedProfile]))
    return [seedProfile]
  }

  try {
    return JSON.parse(saved) as StaffProfile[]
  } catch {
    return []
  }
}

function readSession(): SessionUser | null {
  const saved = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!saved) {
    return null
  }

  try {
    return JSON.parse(saved) as SessionUser
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = () => {
      const savedSession = readSession()
      const profiles = readProfiles()
      const matched = savedSession
        ? profiles.find((entry) => entry.email.toLowerCase() === savedSession.email.toLowerCase())
        : null

      setSession(savedSession)
      setProfile(matched ?? null)
      setLoading(false)
    }

    restoreSession()
    void supabase.auth.getSession().catch(() => undefined)
  }, [])

  const syncProfileState = (nextSession: SessionUser | null, nextProfile: StaffProfile | null) => {
    setSession(nextSession)
    setProfile(nextProfile)

    if (nextSession) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Email and password are required.')
    }

    const profiles = readProfiles()
    const matchedProfile = profiles.find(
      (entry) => entry.email.toLowerCase() === email.trim().toLowerCase() && entry.status === 'active',
    )

    if (!matchedProfile) {
      throw new Error('No active staff profile matches that email.')
    }

    if (password !== DEFAULT_PASSWORD) {
      throw new Error('Invalid password. Use the sample password in the sign-in form.')
    }

    const nextSession: SessionUser = {
      id: matchedProfile.id,
      email: matchedProfile.email,
      authenticatedAt: new Date().toISOString(),
    }

    syncProfileState(nextSession, matchedProfile)
  }

  const signOut = async () => {
    syncProfileState(null, null)
    await supabase.auth.signOut().catch(() => undefined)
  }

  const createProfile = async (payload: StaffProfileInput) => {
    const normalizedEmail = payload.email.trim().toLowerCase()

    if (!payload.fullName.trim()) {
      throw new Error('Full name is required.')
    }

    if (!normalizedEmail) {
      throw new Error('Email is required.')
    }

    const profiles = readProfiles()
    const existing = profiles.some((entry) => entry.email.toLowerCase() === normalizedEmail)

    if (existing) {
      throw new Error('A staff profile already exists for that email.')
    }

    const now = new Date().toISOString()
    const nextProfile: StaffProfile = {
      id: createId(),
      email: normalizedEmail,
      fullName: payload.fullName.trim(),
      role: payload.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    const nextSession: SessionUser = {
      id: nextProfile.id,
      email: nextProfile.email,
      authenticatedAt: now,
    }

    const nextProfiles = [...profiles, nextProfile]
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles))
    syncProfileState(nextSession, nextProfile)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      signIn,
      signOut,
      createProfile,
    }),
    [loading, profile, session],
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
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState message="Checking access..." />
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
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <LoadingState message="Preparing sign-in view..." />
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
  const [email, setEmail] = useState('admin@academy.local')
  const [password, setPassword] = useState('academy123')
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
          Use the demo seeded administrator account or create a new staff profile after signing in.
        </p>

        <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
          Demo login: admin@academy.local / academy123
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
        <h1 className="mb-2 text-3xl font-bold text-white">Create your staff profile</h1>
        <p className="mb-6 text-sm text-slate-300">
          Link the account to a role and status so the dashboard and route guards can enforce access correctly.
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
  const { profile } = useAuth()

  const cards = {
    administrator: [
      { label: 'Active staff', value: '12', accent: 'sky' },
      { label: 'Students', value: '248', accent: 'violet' },
      { label: 'Courses', value: '19', accent: 'emerald' },
    ],
    teacher: [
      { label: 'Assigned courses', value: '4', accent: 'sky' },
      { label: 'Students to review', value: '31', accent: 'amber' },
      { label: 'Sessions today', value: '2', accent: 'emerald' },
    ],
    finance: [
      { label: 'Outstanding fees', value: '$18,420', accent: 'amber' },
      { label: 'This month', value: '$12,350', accent: 'emerald' },
      { label: 'Pending review', value: '7', accent: 'rose' },
    ],
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Overview</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Welcome back, {profile?.fullName}</h1>
        <p className="mt-2 text-slate-300">
          Your access level is set to {profile?.role}. This dashboard is protected by role-aware route guards.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {(cards[profile?.role ?? 'administrator'] ?? cards.administrator).map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-4 text-3xl font-bold text-white">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold text-white">Phase 2 status</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>• Sign-in and sign-out screens are in place.</li>
          <li>• Protected routes enforce authentication before access is granted.</li>
          <li>• Staff profiles can be created and assigned to administrator, teacher, or finance roles.</li>
          <li>• Access checks block users who do not match the required role for a page.</li>
        </ul>
      </section>
    </div>
  )
}

function FeaturePage({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Module</p>
      <h1 className="mt-3 text-3xl font-bold text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-300">{description}</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-400">
        This page is a placeholder for the next feature implementation in the Academy Management System roadmap.
      </div>
    </section>
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
              path="/students"
              element={<FeaturePage title="Students" description="Search, review, and manage active student records with secure role controls." />}
            />
            <Route
              path="/teachers"
              element={<FeaturePage title="Teachers" description="Track staff assignments, active teacher records, and course coverage." />}
            />
            <Route
              path="/courses"
              element={<FeaturePage title="Courses" description="Create and manage course records, teacher assignments, and enrollment status." />}
            />
            <Route
              path="/attendance"
              element={<FeaturePage title="Attendance" description="Review class attendance sessions, mark student status, and enforce duplicate checks." />}
            />
            <Route
              path="/fees"
              element={<FeaturePage title="Fees & Payments" description="Review payment activity, outstanding balances, and financial ledger status for each student." />}
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
