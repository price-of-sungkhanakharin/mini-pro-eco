import React from 'react'
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  Server,
  ChevronRight,
  ChevronLeft,
  Cpu
} from 'lucide-react'

export default function RightSidebar({
  currentView,
  onSelectView,
  isCollapsed,
  onToggleCollapse
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'มอนิเตอร์กล้องสด & สถานะช่องจอด',
      icon: LayoutDashboard,
      badge: 'LIVE',
      badgeColor: 'badge-emerald'
    },
    {
      id: 'logs',
      label: 'Ingestion Logs',
      sublabel: 'ตารางประวัติภาพ & ข้อมูล ESP32',
      icon: ScrollText,
      badge: 'ESP32',
      badgeColor: 'badge-blue'
    },
    {
      id: 'trainer',
      label: 'Auto-Trainer & Hub',
      sublabel: 'เทรน Modal GPU & สลับโมเดล',
      icon: Cpu,
      badge: 'MODAL',
      badgeColor: 'badge-purple'
    },
    {
      id: 'setup',
      label: 'Setup',
      sublabel: 'กำหนดค่าระบบ, ROI & Roboflow',
      icon: Settings,
      badge: 'CONFIG',
      badgeColor: 'badge-indigo'
    },
    {
      id: 'ecosystem',
      label: 'Ecosystem & MLflow',
      sublabel: 'Grafana, MLflow, MinIO, Auth',
      icon: Server,
      badge: 'STACK',
      badgeColor: 'badge-purple'
    }
  ]

  return (
    <aside className={`cpe-right-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header & Toggle */}
      <div className="sidebar-header">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="btn-sidebar-toggle"
          title={isCollapsed ? 'ขยาย Sidebar' : 'ย่อ Sidebar'}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {!isCollapsed && (
          <div className="sidebar-title-group">
            <span className="sidebar-title">ADMIN CONSOLE</span>
            <span className="sidebar-sub">ระบบควบคุมผู้ดูแล</span>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="sidebar-nav">
        <div className="nav-section-title">
          {!isCollapsed && <span>MAIN NAVIGATION</span>}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="nav-btn-icon-wrapper">
                <Icon className="w-4 h-4" />
                {isActive && <span className="active-dot"></span>}
              </div>

              {!isCollapsed && (
                <div className="nav-btn-text">
                  <div className="flex items-center justify-between">
                    <span className="nav-btn-label font-medium">{item.label}</span>
                    {item.badge && (
                      <span className={`nav-badge ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="nav-btn-sublabel">{item.sublabel}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Ecosystem Services Status Box (Only when expanded) */}
      {!isCollapsed && (
        <div className="sidebar-status-box">
          <div className="status-box-header">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-xs text-slate-200">
              AI ECOSYSTEM STACK
            </span>
          </div>

          <div className="status-grid">
            <div className="status-row">
              <div className="status-row-label">
                <span className="service-dot online"></span>
                <span>FastAPI Gateway</span>
              </div>
              <span className="status-port">:8000</span>
            </div>

            <div className="status-row">
              <div className="status-row-label">
                <span className="service-dot online"></span>
                <span>MinIO Object Store</span>
              </div>
              <span className="status-port">:9000</span>
            </div>

            <div className="status-row">
              <div className="status-row-label">
                <span className="service-dot online"></span>
                <span>PostgreSQL 17 DB</span>
              </div>
              <span className="status-port">:5432</span>
            </div>

            <div className="status-row">
              <div className="status-row-label">
                <span className="service-dot online"></span>
                <span>Redis Task Queue</span>
              </div>
              <span className="status-port">:6379</span>
            </div>

            <div className="status-row">
              <div className="status-row-label">
                <span className="service-dot online"></span>
                <span>Label Studio</span>
              </div>
              <span className="status-port">:8080</span>
            </div>
          </div>
        </div>
      )}

    </aside>
  )
}

