import React from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'

/**
 * AuthPage (Editorial Light Design System)
 * Sign In, Registration, and Instant Admin Demo Access.
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
    <main className="w-full max-w-[440px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-8 shadow-[var(--shadow-tile)] flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex bg-[var(--color-chip)] p-1 rounded-full border border-[var(--color-border)]">
        <button
          type="button"
          className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'login'
              ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-bold'
              : 'text-[var(--color-text-2)] hover:text-[var(--color-ink)]'
          }`}
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
          className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'register'
              ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-bold'
              : 'text-[var(--color-text-2)] hover:text-[var(--color-ink)]'
          }`}
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
        <div className="p-3 bg-[var(--color-status-full-bg)] border border-[var(--color-status-full-border)] rounded-xl text-[var(--color-status-full-text)] text-xs flex items-center gap-2 font-medium">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-[var(--color-green-tint)] border border-[var(--color-green-border)] rounded-xl text-[var(--color-green-text)] text-xs flex items-center gap-2 font-medium">
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs font-semibold text-[var(--color-text-2)]" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-3.5 py-2.5 bg-[var(--color-chip)] border border-[var(--color-border)] rounded-[var(--radius-input)] text-[var(--color-ink)] text-sm focus:outline-none focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)] transition-all font-mono"
            placeholder="admin@cpe.eng.psu.ac.th"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs font-semibold text-[var(--color-text-2)]" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3.5 py-2.5 bg-[var(--color-chip)] border border-[var(--color-border)] rounded-[var(--radius-input)] text-[var(--color-ink)] text-sm focus:outline-none focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)] transition-all font-mono"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {activeTab === 'register' && (
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-[var(--color-text-2)]" htmlFor="role">
              User Role
            </label>
            <select
              id="role"
              className="w-full px-3.5 py-2.5 bg-[var(--color-chip)] border border-[var(--color-border)] rounded-[var(--radius-input)] text-[var(--color-ink)] text-sm focus:outline-none focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)] transition-all font-sans"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Administrator</option>
              <option value="user">User</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-full font-bold text-sm bg-[var(--color-ink)] hover:bg-black text-[var(--color-bg)] transition-all disabled:opacity-50 mt-1 cursor-pointer"
        >
          {loading ? 'Processing...' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {/* Quick 1-Click Admin Access */}
      <div className="pt-4 border-t border-[var(--color-border)] flex flex-col gap-2">
        <span className="text-xs text-[var(--color-text-2)] text-center">หรือทดสอบมุมมองผู้ดูแลระบบทันที:</span>
        <button
          type="button"
          onClick={handleQuickAdminDemo}
          className="w-full py-2.5 px-4 rounded-full text-xs font-bold bg-[var(--color-green-tint)] hover:bg-[var(--color-mint)] text-[var(--color-green-text)] border border-[var(--color-green-border)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Quick Access: เข้าสู่หน้า Admin Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </main>
  )
}
