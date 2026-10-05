import React, { useState, useEffect, useRef } from 'react'
import {
  Menu,
  ChevronDown,
  Layers,
  Clock,
  LogOut
} from 'lucide-react'

export default function Navbar({
  user,
  onLogout,
  stats,
  currentView = 'dashboard',
  onSelectView,
  isMobileDrawerOpen = false,
  onToggleMobileDrawer
}) {
  const [time, setTime] = useState(new Date())
  const [isStackOpen, setIsStackOpen] = useState(false)
  const popoverRef = useRef(null)
  const stackButtonRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsStackOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsStackOpen(false)
        stackButtonRef.current?.focus()
      }
    }
    if (isStackOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isStackOpen])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'logs', label: 'Ingestion Logs' },
    { id: 'trainer', label: 'Auto-Trainer & Hub' },
    { id: 'setup', label: 'Setup & ROI' },
    { id: 'ecosystem', label: 'บริการระบบ (Ecosystem)' },
    { id: 'analytics', label: 'Analytics / Plots' },
    { id: 'details', label: 'รายละเอียดโครงการ' }
  ]

  // Exact 5 original services from A3 audit
  const aiStackServices = [
    { name: 'FastAPI Gateway', port: ':8000' },
    { name: 'MinIO Object Store', port: ':9000' },
    { name: 'PostgreSQL 17 DB', port: ':5432' },
    { name: 'Redis Task Queue', port: ':6379' },
    { name: 'Label Studio', port: ':8080' }
  ]

  return (
    <header className="cpe-navbar">
      {/* Row 1: Brand (Left), Right Controls (Right) */}
      <div className="navbar-row-top">
        {/* Brand Group */}
        <div className="navbar-brand-wrapper">
          <div className="brand-chain-mark">
            <span className="brand-chain-inner" />
          </div>
          <span className="brand-wordmark">CPE Smart Parking AI</span>
          <span className="navbar-status-dot" aria-label="System status online" />
        </div>

        {/* Right Actions Group */}
        <div className="navbar-top-right">
          {/* AI Stack Status Popover Chip (Desktop >=1024px) */}
          <div className="navbar-stack-wrapper" ref={popoverRef}>
            <button
              ref={stackButtonRef}
              type="button"
              onClick={() => setIsStackOpen((prev) => !prev)}
              className={`navbar-stack-chip ${isStackOpen ? 'active' : ''}`}
              aria-expanded={isStackOpen}
              aria-haspopup="true"
              title="ดูสถานะ AI Ecosystem Stack"
            >
              <Layers className="navbar-stack-icon" />
              <span className="navbar-stack-label">AI Stack (5)</span>
              <ChevronDown className={`navbar-stack-arrow ${isStackOpen ? 'open' : ''}`} />
            </button>

            {isStackOpen && (
              <div className="navbar-stack-popover" role="dialog" aria-label="AI Ecosystem Stack">
                <div className="stack-popover-header">
                  <span className="stack-popover-title">AI ECOSYSTEM STACK</span>
                </div>
                <div className="stack-popover-list">
                  {aiStackServices.map((svc) => (
                    <div key={svc.name} className="stack-status-row">
                      <div className="stack-service-info">
                        <span className="status-indicator-dot" />
                        <span className="stack-service-name">{svc.name}</span>
                      </div>
                      <span className="stack-service-port">{svc.port}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clock Display */}
          <div className="navbar-clock">
            <Clock className="navbar-clock-icon" />
            <span className="navbar-clock-time">
              {time.toLocaleTimeString('th-TH', { hour12: false })}
            </span>
          </div>

          {/* User Profile Badge */}
          <div className="navbar-user-badge">
            <div className="navbar-user-avatar">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">
                {user?.email ? user.email.split('@')[0] : 'Admin'}
              </span>
              <span className="navbar-user-role">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="navbar-logout-btn"
            title="ออกจากระบบ"
          >
            <LogOut className="navbar-logout-icon" />
            <span className="navbar-logout-text">Logout</span>
          </button>

          {/* Mobile Hamburger Toggle (<1024px) */}
          <button
            type="button"
            onClick={onToggleMobileDrawer}
            className="navbar-hamburger-btn"
            aria-label="Toggle navigation drawer"
            aria-expanded={isMobileDrawerOpen}
          >
            <Menu className="navbar-hamburger-icon" />
          </button>
        </div>
      </div>

      {/* Row 2: Desktop Navigation Links (>=1024px) */}
      <nav className="navbar-row-bottom" aria-label="Main Navigation">
        <div className="navbar-links-group">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView?.(item.id)}
                className={`navbar-desktop-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{item.label}</span>
                {isActive && <span className="nav-link-indicator" />}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
