import { useState, useEffect } from 'react'

function App() {
  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [user, setUser] = useState(null)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch current user details when token is present
  useEffect(() => {
    if (token && !user) {
      setLoading(true)
      fetch('http://localhost:8000/api/v1/auth/me', {
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
          setLoading(false)
        })
        .catch(() => {
          // Token invalid or expired
          handleLogout()
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
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
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

      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
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
      const meResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (meResponse.ok) {
        const userData = await meResponse.json()
        setUser(userData)
      }

      setSuccess('Logged in successfully!')
    } catch (err) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Header & Brand Title */}
      <header className="header">
        <h1 className="brand-title">
          FastAPI AI Ecosystem Gateway
          <span className="glowing-badge">
            <span className="status-dot"></span>
            v1.0 Live
          </span>
        </h1>
        <p className="subtitle">Secure Authentication & Control Plane for AI Microservices</p>
      </header>

      {/* Main Content Area */}
      {!token ? (
        /* Authentication Container (Not Logged In) */
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
                  placeholder="user@example.com"
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
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
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
        </main>
      ) : (
        /* Dashboard Container (Logged In) */
        <main className="dashboard-grid">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div>
              <h2 className="welcome-title">Welcome back, {user?.email || email || 'User'}!</h2>
              <p className="welcome-subtitle">You are authenticated to access ecosystem API services.</p>
            </div>
            <button type="button" className="logout-btn" style={{ width: 'auto' }} onClick={handleLogout}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          {/* User Profile Card */}
          <div className="dashboard-card">
            <h3 className="card-title">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              User Account Profile
            </h3>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user?.email || email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Assigned Role</span>
              <span className="role-badge">{user?.role || role || 'user'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Account Created</span>
              <span className="info-value">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Account ID</span>
              <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {user?.id || 'Active'}
              </span>
            </div>
          </div>

          {/* JWT Token Card */}
          <div className="dashboard-card">
            <h3 className="card-title">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              JWT Bearer Access Token
            </h3>
            <div className="token-box">
              {showToken ? token : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
            <div className="token-actions">
              <button type="button" className="small-btn" onClick={() => setShowToken(!showToken)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showToken ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 013.682-.713c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-3.568-1.41a3 3 0 11-4.243-4.243m4.243 4.243L3 3l18 18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
                {showToken ? 'Hide Token' : 'Reveal Token'}
              </button>
              <button type="button" className="small-btn" onClick={handleCopyToken}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {copied ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  )}
                </svg>
                {copied ? 'Copied!' : 'Copy Token'}
              </button>
            </div>
          </div>

          {/* Active System Services Summary Card */}
          <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="card-title">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 02-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Active Ecosystem Services Summary
            </h3>
            <div className="service-status-list">
              <div className="service-item">
                <div className="service-name">
                  <span className="status-indicator status-online"></span>
                  <span>Authentication Service (`/api/v1/auth`)</span>
                </div>
                <span className="status-badge-active">Operational</span>
              </div>
              <div className="service-item">
                <div className="service-name">
                  <span className="status-indicator status-online"></span>
                  <span>AI Inference & Model Gateway</span>
                </div>
                <span className="status-badge-active">Operational</span>
              </div>
              <div className="service-item">
                <div className="service-name">
                  <span className="status-indicator status-online"></span>
                  <span>Vector Database & Knowledge Mesh</span>
                </div>
                <span className="status-badge-active">Operational</span>
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  )
}

export default App
