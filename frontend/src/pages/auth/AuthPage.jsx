import React from 'react'

/**
 * AuthPage (หน้าเพจเข้าสู่ระบบ / สมาชิก)
 * จัดการฟอร์ม Sign In, Register, สลับแท็บ และปุ่ม Quick Admin Demo Access
 */
export default function AuthPage({
  activeTab,
  setActiveTab,
  email,
  setEmail,
  password,
  setPassword,
  role,
  setRole,
  error,
  setError,
  success,
  setSuccess,
  loading,
  handleLogin,
  handleRegister,
  handleQuickAdminDemo
}) {
  return (
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
          <span>Quick Access: เข้าสู่หน้า Admin Dashboard</span>
        </button>
      </div>
    </main>
  )
}
