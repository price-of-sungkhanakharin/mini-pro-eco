import React, { useState, useEffect, useRef } from 'react'
import {
  Menu,
  ChevronDown,
  Layers,
  Clock,
  LogOut
} from 'lucide-react'
import {
  FastAPILogo,
  MinIOLogo,
  PostgreSQLLogo,
  RedisLogo,
  LabelStudioLogo
} from '../ui/ServiceLogos'

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
    { id: 'details', label: 'Architecture & Flowchart' }
  ]

  // Exact 5 original services from A3 audit with authentic logos
  const aiStackServices = [
    { name: 'FastAPI Gateway', port: ':8000', logo: FastAPILogo },
    { name: 'MinIO Object Store', port: ':9000', logo: MinIOLogo },
    { name: 'PostgreSQL 17 DB', port: ':5432', logo: PostgreSQLLogo },
    { name: 'Redis Task Queue', port: ':6379', logo: RedisLogo },
    { name: 'Label Studio', port: ':8080', logo: LabelStudioLogo }
  ]

  const currentItem =
    navItems.find((i) => i.id === currentView) ||
    (currentView === 'camera_control' ? navItems.find((i) => i.id === 'setup') : navItems[0])

  return (
    <header className="cpe-navbar">
      {/* Row 1: Brand (Left), Right Controls & Action Button */}
      <div className="navbar-row-top">
        <div className="navbar-row-inner">
          {/* Left Group: Mobile Hamburger (<1024px) + Brand Group */}
          <div className="navbar-left-group">
            <button
              type="button"
              onClick={onToggleMobileDrawer}
              className="navbar-hamburger-btn"
              aria-label="เปิดเมนูนำทาง (Sidebar)"
              aria-expanded={isMobileDrawerOpen}
              title="เปิดเมนูนำทาง"
            >
              <Menu className="navbar-hamburger-icon" />
            </button>

            {/* Brand Group (Figma Spec: 40x26 chain mark, 17px Inter #30312F wordmark, 7px gap) */}
            <div className="navbar-brand-wrapper">
              <div className="brand-chain-mark">
                <span className="brand-chain-inner" />
              </div>
              <span className="brand-wordmark">CPE Smart Parking AI</span>
              <span className="navbar-status-dot" aria-label="System status online" />
            </div>
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
                    {aiStackServices.map((svc) => {
                      const Logo = svc.logo
                      return (
                        <div key={svc.name} className="stack-status-row">
                          <div className="stack-service-info">
                            <span className="status-indicator-dot" />
                            {Logo && <Logo size={16} className="inline-block" />}
                            <span className="stack-service-name">{svc.name}</span>
                          </div>
                          <span className="stack-service-port">{svc.port}</span>
                        </div>
                      )
                    })}
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

            {/* Action Button (Figma Spec: 48px height, 100px radius, #30312F bg, white text) */}
            <button
              type="button"
              onClick={onLogout}
              className="navbar-action-btn"
              title="ออกจากระบบ"
            >
              <LogOut className="navbar-action-icon" />
              <span className="navbar-action-label">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Desktop Navigation Links (>=1024px) Right-Aligned with Active Indicator */}
      <nav className="navbar-row-bottom" aria-label="Main Navigation">
        <div className="navbar-row-inner navbar-row-bottom-inner">
          {/* Desktop Navigation items (Clean, left-aligned, no overlapping active view badge) */}
          <div className="navbar-links-group">
            {navItems.map((item) => {
              const isActive =
                currentView === item.id ||
                (item.id === 'setup' &&
                  (currentView === 'camera_control' ||
                    currentView === 'slot_map' ||
                    currentView === 'label_studio'))
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView?.(item.id)}
                  className={`navbar-nav-item ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="navbar-nav-link">{item.label}</span>
                  <span className={`nav-link-indicator ${isActive ? 'active' : ''}`} />
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </header>
  )
}
