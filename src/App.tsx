import { useMemo } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AuthPage } from './auth/AuthPage'
import { StoreProvider, useStore } from './lib/store'
import { localBackend, supabaseBackend } from './lib/backend'
import { EditorsProvider } from './components/Editors'
import { Shell } from './components/Shell'
import { Button } from './components/ui'
import { Onboarding } from './pages/Onboarding'
import { Today } from './pages/Today'
import { Assignments } from './pages/Assignments'
import { CalendarPage } from './pages/Calendar'
import { Courses, CourseDetail } from './pages/Courses'
import { Projects } from './pages/Projects'
import { Study } from './pages/Study'
import { Clubs } from './pages/Clubs'
import { Settings } from './pages/Settings'

function Protected() {
  const { userId, loading, demo } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="boot" role="status">Loading…</div>
  if (!userId) return <Navigate to="/signin" state={{ from: loc.pathname }} replace />
  return <Data userId={userId} demo={demo} />
}

function Data({ userId, demo }: { userId: string; demo: boolean }) {
  const backend = useMemo(() => (demo ? localBackend() : supabaseBackend(userId)), [userId, demo])
  return <StoreProvider key={userId} backend={backend} userId={userId}><Gate /></StoreProvider>
}

function Gate() {
  const { status, loadError, reload, db } = useStore()
  const loc = useLocation()
  if (status === 'loading') return <div className="boot" role="status">Loading your schedule…</div>
  if (status === 'error')
    return (
      <div className="boot" role="alert">
        <p>We couldn’t load your data{loadError ? ` (${loadError})` : ''}. If this is a new project, make sure the SQL migration has been run.</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    )
  if (!db.prefs.onboarded && loc.pathname !== '/welcome') return <Navigate to="/welcome" replace />
  return <EditorsProvider><Outlet /></EditorsProvider>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<AuthPage mode="signin" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot" element={<AuthPage mode="forgot" />} />
        <Route path="/reset" element={<AuthPage mode="reset" />} />
        <Route element={<Protected />}>
        <Route path="/welcome" element={<Onboarding />} />
        <Route element={<Shell />}>
          <Route index element={<Today />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="study" element={<Study />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
