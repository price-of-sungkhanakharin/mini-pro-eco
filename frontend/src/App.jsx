import { useState, useEffect } from 'react'
import './dashboard.css'
import Navbar from './components/Navbar.jsx'
import RightSidebar from './components/RightSidebar.jsx'
import DashboardView from './components/DashboardView.jsx'
import SetupView from './components/SetupView.jsx'
import ParkingSetup from './components/ParkingSetup.jsx'
import CameraModal from './components/CameraModal.jsx'
import RoboflowStudio from './components/RoboflowStudio.jsx'
import EcosystemView from './components/EcosystemView.jsx'
import IngestionLogsView from './components/IngestionLogsView.jsx'
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

  // Dashboard Navigation State
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('view=setup')) {
      return 'setup'
    }
    return 'dashboard'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [setupCameraId, setSetupCameraId] = useState('cam1')

  const handleNavigate = (view, targetCamId) => {
    if (targetCamId) {
      setSetupCameraId(targetCamId)
    }
    setCurrentView(view)
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
        /* ================= AUTHENTICATION VIEW (NOT LOGGED IN) ================= */
        <div className="flex flex-col items-center justify-center w-full min-h-screen py-10 px-4">
          <header className="header">
            <h1 className="brand-title">
              CPE Smart Parking AI
              <span className="glowing-badge">
                <span className="status-dot"></span>
                v2.0 Ecosystem Live
              </span>
            </h1>
            <p className="subtitle">
              ระบบทำนายที่จอดรถอัจฉริยะ ภาควิชาวิศวกรรมคอมพิวเตอร์ (3 Phone Cameras Stream)
            </p>
          </header>

          <main className="glass-card">
            <div className="tab-container">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('login')
                  setError(null)
                  setSuccess(null)
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('register')
                  setError(null)
                  setSuccess(null)
                }}
              >
                Register
              </button>
            </div>

            {/* Alert Boxes */}
            {error && (
              <div className="alert alert-error" role="alert">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success" role="status">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="admin@cpe.eng.psu.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {activeTab === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="role">User Role</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <select
                      id="role"
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="admin">Administrator</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Processing...</span>
                  </>
                ) : activeTab === 'login' ? (
                  'Sign In to Gateway'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Quick Demo Access */}
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-slate-400 mb-2">หรือทดสอบมุมมองผู้ดูแลระบบทันที:</p>
              <button
                type="button"
                onClick={handleQuickAdminDemo}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>⚡ Quick Access: เข้าสู่หน้า Admin Dashboard</span>
              </button>
            </div>
          </main>
        </div>
      ) : (
        /* ================= EXECUTIVE SMART PARKING DASHBOARD (LOGGED IN) ================= */
        <div className="dashboard-app-shell">
          {/* Top Monitoring Navbar */}
          <Navbar
            user={user}
            onLogout={handleLogout}
            stats={stats}
          />

          {/* Main Stage with Center Content & Right Sidebar */}
          <div className="dashboard-main-layout">
            <main className="dashboard-center-stage">
              {currentView === 'dashboard' && (
                <DashboardView
                  onOpenModal={(cam) => setSelectedCamera(cam)}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'logs' && (
                <IngestionLogsView onNavigate={handleNavigate} />
              )}
              {currentView === 'setup' && (
                <SetupView
                  onNavigate={handleNavigate}
                  initialCameraId={setupCameraId}
                  apiBase={API_BASE_URL}
                />
              )}
              {currentView === 'live_cameras' && (
                <DashboardView
                  onOpenModal={(cam) => setSelectedCamera(cam)}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'slot_map' && (
                <SetupView
                  onNavigate={handleNavigate}
                  initialCameraId={setupCameraId}
                  initialTab="slots"
                  apiBase={API_BASE_URL}
                />
              )}
              {currentView === 'roboflow' && (
                <SetupView
                  onNavigate={handleNavigate}
                  initialCameraId={setupCameraId}
                  initialTab="roboflow"
                  apiBase={API_BASE_URL}
                />
              )}
              {currentView === 'ai_inference' && (
                <DashboardView
                  onOpenModal={(cam) => setSelectedCamera(cam)}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'line_bot' && (
                <DashboardView
                  onOpenModal={(cam) => setSelectedCamera(cam)}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'ecosystem' && (
                <EcosystemView />
              )}
            </main>

            {/* Right-Hand Admin Sidebar (Explicitly Requested by User) */}
            <RightSidebar
              currentView={currentView}
              onSelectView={(view) => handleNavigate(view)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>

          {/* Camera Inspection Modal */}
          {selectedCamera && (
            <CameraModal
              camera={selectedCamera}
              onClose={() => setSelectedCamera(null)}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      )}
    </>
  )
}

export default App
