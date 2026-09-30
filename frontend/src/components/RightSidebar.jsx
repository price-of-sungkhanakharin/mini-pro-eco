import React from 'react'
import {
  LayoutDashboard,
  Settings,
  Video,
  MapPin,
  Cpu,
  MessageSquare,
  Server,
  Database,
  HardDrive,
  Layers,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  CheckCircle2,
  AlertCircle
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
      id: 'setup',
      label: 'Setup',
      sublabel: 'กำหนดค่าระบบ & จุดติดตั้งกล้อง',
      icon: Settings,
      badge: 'CONFIG',
      badgeColor: 'badge-indigo',
      isSetup: true
    },
    {
      id: 'live_cameras',
      label: 'Live Streams',
      sublabel: 'มุมมองเจาะลึก 3 กล้องสมาร์ทโฟน',
      icon: Video,
      badge: '3 CAM',
      badgeColor: 'badge-blue'
    },
    {
      id: 'slot_map',
      label: 'Parking Slot ROI',
      sublabel: 'ผังพิกัด Bounding Box ช่องจอด',
      icon: MapPin,
      badge: 'MAP',
      badgeColor: 'badge-amber'
    },
    {
      id: 'roboflow',
      label: 'Roboflow Project',
      sublabel: 'โปรเจกต์ cctv-parking & Annotation',
      icon: Layers,
      badge: 'ROBO',
      badgeColor: 'badge-indigo'
    },
    {
      id: 'ai_inference',
      label: 'AI & Prediction',
      sublabel: 'โมเดลทำนาย % โอกาสว่าง',
      icon: Cpu,
      badge: 'MODEL',
      badgeColor: 'badge-purple'
    },
    {
      id: 'line_bot',
      label: 'LINE Advisory',
      sublabel: 'จำลองคำตอบ Chatbot สำหรับ User',
      icon: MessageSquare,
      badge: 'BOT',
      badgeColor: 'badge-cyan'
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
              className={`sidebar-nav-btn ${isActive ? 'active' : ''} ${
                item.isSetup ? 'setup-highlight' : ''
              }`}
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

      {/* Edge Camera Status (Smartphone 3 Nodes) */}
      {!isCollapsed && (
        <div className="sidebar-camera-box">
          <div className="status-box-header">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-xs text-slate-200">
              PHONE CAMERAS (5s)
            </span>
          </div>
          <div className="camera-status-list">
            <div className="cam-status-item">
              <div className="flex items-center gap-1.5">
                <span className="camera-ping-dot"></span>
                <span className="cam-item-id font-mono font-bold">CAM-01</span>
                <span className="cam-item-name">ลานหน้าภาควิชา</span>
              </div>
              <span className="cam-item-ping font-mono text-[10px] text-emerald-400">42ms</span>
            </div>
            <div className="cam-status-item">
              <div className="flex items-center gap-1.5">
                <span className="camera-ping-dot"></span>
                <span className="cam-item-id font-mono font-bold">CAM-02</span>
                <span className="cam-item-name">ลานข้างตึกในร่ม</span>
              </div>
              <span className="cam-item-ping font-mono text-[10px] text-emerald-400">38ms</span>
            </div>
            <div className="cam-status-item">
              <div className="flex items-center gap-1.5">
                <span className="camera-ping-dot"></span>
                <span className="cam-item-id font-mono font-bold">CAM-03</span>
                <span className="cam-item-name">ลานหลังภาควิชา</span>
              </div>
              <span className="cam-item-ping font-mono text-[10px] text-emerald-400">46ms</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
