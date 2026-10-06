import React from 'react'
import {
  LayoutDashboard,
  ScrollText,
  Cpu,
  Settings,
  Server,
  BarChart2,
  FileText,
  Sliders,
  X
} from 'lucide-react'

export default function RightSidebar({
  currentView = 'dashboard',
  onSelectView,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sub: 'Real-time telemetry & CCTV feeds',
      icon: LayoutDashboard
    },
    {
      id: 'logs',
      label: 'Ingestion Logs',
      sub: 'Audit trail & sensor diagnostics',
      icon: ScrollText
    },
    {
      id: 'trainer',
      label: 'Auto-Trainer & Hub',
      sub: 'Model registry & pipeline tuning',
      icon: Cpu
    },
    {
      id: 'setup',
      label: 'Setup & ROI Config',
      sub: 'Slot geometry, cameras & deep sleep',
      icon: Settings
    },
    {
      id: 'ecosystem',
      label: 'บริการระบบ (Ecosystem)',
      sub: 'Auto-Login: MinIO, Label Studio, Postgres, MLflow',
      icon: Server
    },
    {
      id: 'analytics',
      label: 'Analytics / Plots',
      sub: 'Model benchmarks, telemetry & occupancy',
      icon: BarChart2
    },
    {
      id: 'details',
      label: 'Architecture & Flowchart',
      sub: 'ESP32 lifecycle, YOLO selection & whitepaper',
      icon: FileText
    }
  ]

  // Exact 5 original services from A3 audit
  const aiStackServices = [
    { name: 'FastAPI Gateway', port: ':8000' },
    { name: 'MinIO Object Store', port: ':9000' },
    { name: 'PostgreSQL 17 DB', port: ':5432' },
    { name: 'Redis Task Queue', port: ':6379' },
    { name: 'Label Studio', port: ':8080' }
  ]

  const handleItemClick = (id) => {
    onSelectView?.(id)
    onCloseMobileDrawer?.()
  }

  return (
    <>
      {isMobileDrawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobileDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`cpe-right-sidebar ${isMobileDrawerOpen ? 'drawer-open' : ''}`}
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header with Close Button */}
        <div className="sidebar-mobile-header">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#30312F] tracking-tight">
              เมนูนำทางระบบ (Navigation)
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="sidebar-close-btn"
            aria-label="Close navigation menu"
            title="ปิดเมนู"
          >
            <X className="sidebar-close-icon" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
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
                onClick={() => handleItemClick(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="sidebar-nav-icon-wrap">
                  <Icon className="sidebar-nav-icon" />
                </div>
                <div className="sidebar-nav-text">
                  <div className="sidebar-nav-label">{item.label}</div>
                  <div className="sidebar-nav-sub">{item.sub}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* AI Stack Status Box in Mobile Drawer */}
        <div className="sidebar-stack-box">
          <div className="stack-box-header">
            <Server className="stack-box-icon" />
            <span className="stack-box-title">AI ECOSYSTEM STACK</span>
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
      </aside>
    </>
  )
}
