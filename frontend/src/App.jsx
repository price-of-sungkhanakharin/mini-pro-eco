import { useState, useEffect } from 'react'
import './styles/dashboard.css'
import BaseLayout from './layouts/BaseLayout.jsx'
import BlankLayout from './layouts/BlankLayout.jsx'
import AuthPage from './pages/auth/AuthPage.jsx'
import DashboardPage from './pages/dashboard/DashboardPage.jsx'
import SetupPage from './pages/setup/SetupPage.jsx'
import AutoTrainerPage from './pages/trainer/AutoTrainerPage.jsx'
import IngestionLogsPage from './pages/ingestion_logs/IngestionLogsPage.jsx'
import EcosystemPage from './pages/ecosystem/EcosystemPage.jsx'
import AnalyticsPage from './pages/analytics/AnalyticsPage.jsx'
import ProjectDetailsPage from './pages/details/ProjectDetailsPage.jsx'
import LiveCamerasPage from './pages/dashboard/LiveCamerasPage.jsx'
import CameraModal from './components/ui/CameraModal.jsx'

import {
  getSavedOrInitialSlots,
  calculateSlotCounts,
  SLOTS_STORAGE_KEY
} from './utils/dumpData'

function calculateTotalStats() {
  const cam1Counts = calculateSlotCounts(getSavedOrInitialSlots('cam1'))
  const cam2Counts = calculateSlotCounts(getSavedOrInitialSlots('cam2'))
  const cam3Counts = calculateSlotCounts(getSavedOrInitialSlots('cam3'))

  const freeCar = cam1Counts.car.free + cam2Counts.car.free + cam3Counts.car.free
  const totalCar = cam1Counts.car.total + cam2Counts.car.total + cam3Counts.car.total
  const freeBike = cam1Counts.bike.free + cam2Counts.bike.free + cam3Counts.bike.free
  const totalBike = cam1Counts.bike.total + cam2Counts.bike.total + cam3Counts.bike.total
  const totalCapacity = totalCar + totalBike
  const totalFree = freeCar + freeBike
  const avgChance =
    totalCapacity > 0
      ? Math.min(99, Math.max(30, Math.round((totalFree / totalCapacity) * 100 + 8)))
      : 79

  return {
    freeCar,
    totalCar,
    freeBike,
    totalBike,
    avgChance
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000')

const pathToViewMap = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/live-cameras': 'live_cameras',
  '/cameras': 'live_cameras',
  '/logs': 'logs',
  '/ingestion-logs': 'logs',
  '/trainer': 'trainer',
  '/auto-trainer': 'trainer',
  '/setup': 'setup',
  '/ecosystem': 'ecosystem',
  '/services': 'ecosystem',
  '/analytics': 'analytics',
  '/plots': 'analytics',
  '/details': 'details',
  '/project-details': 'details'
}

const viewToPathMap = {
  dashboard: '/dashboard',
  live_cameras: '/live-cameras',
  logs: '/logs',
  trainer: '/trainer',
  setup: '/setup',
  ecosystem: '/ecosystem',
  analytics: '/analytics',
  details: '/details'
}

function getViewFromLocation() {
  if (typeof window === 'undefined') return 'dashboard'
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/'
  if (pathToViewMap[path]) {
    return pathToViewMap[path]
  }
  const params = new URLSearchParams(window.location.search)
  const qView = params.get('view')
  if (qView && pathToViewMap[`/${qView}`]) {
    return pathToViewMap[`/${qView}`]
  }
  return 'dashboard'
}

function App() {
  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return 'preview-token-2026'
    }
    return localStorage.getItem('access_token')
  })
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return { id: 1, email: 'admin@cpe.eng.psu.ac.th', role: 'admin' }
    }
    const saved = localStorage.getItem('user_profile')
    return saved ? JSON.parse(saved) : null
  })

  const [currentView, setCurrentView] = useState(() => getViewFromLocation())
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [setupCameraId, setSetupCameraId] = useState('cam1')

  const handleNavigate = (view, targetCamId, push = true) => {
    if (targetCamId) {
      setSetupCameraId(targetCamId)
    }
    setCurrentView(view)

    if (push && typeof window !== 'undefined') {
      const targetPath = viewToPathMap[view] || `/${view}`
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view, targetCamId }, '', targetPath)
      }
    }
  }

  // Parking live stats state - dynamically synchronized with ROI setup across all cameras
  const [stats, setStats] = useState(() => calculateTotalStats())

  // Listen for ROI updates from ParkingSetup
  useEffect(() => {
    const handleUpdate = () => {
      setStats(calculateTotalStats())
    }
    const handleStorage = (e) => {
      if (!e.key || e.key.startsWith('cpe_parking_slots_')) {
        setStats(calculateTotalStats())
      }
    }
    window.addEventListener('cpe-slots-updated', handleUpdate)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('cpe-slots-updated', handleUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Synchronize browser URL history (Back / Forward button support)
  useEffect(() => {
    const handlePopState = (e) => {
      const nextView = e.state?.view || getViewFromLocation()
      const targetCamId = e.state?.targetCamId
      if (targetCamId) {
        setSetupCameraId(targetCamId)
      }
      setCurrentView(nextView)
    }

    if (typeof window !== 'undefined') {
      const initialView = getViewFromLocation()
      const targetPath = viewToPathMap[initialView] || `/${initialView}`
      if (window.location.pathname === '/' || window.location.pathname !== targetPath) {
        window.history.replaceState({ view: initialView }, '', targetPath)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Fetch current user details when token is present
  useEffect(() => {
    if (token && !user) {
      setLoading(true)
      fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error('Session expired or invalid token')
          }
          return res.json()
        })
        .then((data) => {
          setUser(data)
          localStorage.setItem('user_profile', JSON.stringify(data))
          setLoading(false)
        })
        .catch(() => {
          // If offline or invalid token, keep offline admin session if explicitly set
          if (!localStorage.getItem('is_demo_session')) {
            handleLogout()
          }
          setLoading(false)
        })
    }
  }, [token, user])

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed')
      }

      setSuccess('Registration successful! Please sign in with your credentials.')
      setActiveTab('login')
      setPassword('')
    } catch (err) {
      setError(err.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid email or password')
      }

      const accessToken = data.access_token
      localStorage.setItem('access_token', accessToken)
      setToken(accessToken)

      // Fetch user profile after successful login
      const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (meResponse.ok) {
        const userData = await meResponse.json()
        setUser(userData)
        localStorage.setItem('user_profile', JSON.stringify(userData))
      }

      setSuccess('Logged in successfully!')
    } catch (err) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  // Quick Admin Preview (for testing without running DB/backend)
  const handleQuickAdminDemo = () => {
    const demoToken = 'demo-admin-session-cpe-parking-2026'
    const demoUser = {
      id: 1,
      email: 'admin@cpe.eng.psu.ac.th',
      role: 'admin',
      created_at: new Date().toISOString()
    }
    localStorage.setItem('access_token', demoToken)
    localStorage.setItem('user_profile', JSON.stringify(demoUser))
    localStorage.setItem('is_demo_session', 'true')
    setToken(demoToken)
    setUser(demoUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_profile')
    localStorage.removeItem('is_demo_session')
    setToken(null)
    setUser(null)
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
  }

  return (
    <>
      {!token ? (
        <BlankLayout>
          <AuthPage
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            role={role}
            setRole={setRole}
            error={error}
            setError={setError}
            success={success}
            setSuccess={setSuccess}
            loading={loading}
            handleLogin={handleLogin}
            handleRegister={handleRegister}
            handleQuickAdminDemo={handleQuickAdminDemo}
          />
        </BlankLayout>
      ) : currentView === 'live_cameras' ? (
        <>
          <LiveCamerasPage
            onOpenModal={(cam) => setSelectedCamera(cam)}
            onNavigate={handleNavigate}
          />
          {selectedCamera && (
            <CameraModal
              camera={selectedCamera}
              onClose={() => setSelectedCamera(null)}
              onNavigate={handleNavigate}
            />
          )}
        </>
      ) : (
        <BaseLayout
          user={user}
          onLogout={handleLogout}
          stats={stats}
          currentView={currentView}
          onSelectView={(view) => handleNavigate(view)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          selectedCamera={selectedCamera}
          onCloseCameraModal={() => setSelectedCamera(null)}
          onNavigate={handleNavigate}
        >
          {currentView === 'dashboard' && (
            <DashboardPage
              onOpenModal={(cam) => setSelectedCamera(cam)}
              onNavigate={handleNavigate}
            />
          )}
          {currentView === 'logs' && (
            <IngestionLogsPage onNavigate={handleNavigate} />
          )}
          {(currentView === 'trainer' || currentView === 'auto_trainer') && (
            <AutoTrainerPage apiBase={API_BASE_URL} />
          )}
          {currentView === 'setup' && (
            <SetupPage
              onNavigate={handleNavigate}
              initialCameraId={setupCameraId}
              apiBase={API_BASE_URL}
            />
          )}
          {currentView === 'slot_map' && (
            <SetupPage
              onNavigate={handleNavigate}
              initialCameraId={setupCameraId}
              initialTab="slots"
              apiBase={API_BASE_URL}
            />
          )}
          {currentView === 'label_studio' && (
            <SetupPage
              onNavigate={handleNavigate}
              initialCameraId={setupCameraId}
              initialTab="label_studio"
              apiBase={API_BASE_URL}
            />
          )}
          {currentView === 'ai_inference' && (
            <DashboardPage
              onOpenModal={(cam) => setSelectedCamera(cam)}
              onNavigate={handleNavigate}
            />
          )}
          {currentView === 'line_bot' && (
            <DashboardPage
              onOpenModal={(cam) => setSelectedCamera(cam)}
              onNavigate={handleNavigate}
            />
          )}
          {currentView === 'ecosystem' && (
            <EcosystemPage onNavigate={handleNavigate} />
          )}
          {currentView === 'analytics' && (
            <AnalyticsPage apiBase={API_BASE_URL} />
          )}
          {currentView === 'details' && (
            <ProjectDetailsPage onNavigate={handleNavigate} />
          )}
        </BaseLayout>
      )}
    </>
  )
}

export default App
