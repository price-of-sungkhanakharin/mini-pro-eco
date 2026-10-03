import React from 'react'
import Navbar from '../components/navigation/Navbar.jsx'
import RightSidebar from '../components/navigation/RightSidebar.jsx'
import CameraModal from '../components/ui/CameraModal.jsx'

/**
 * BaseLayout (Layout หลัก)
 * ครอบคลุม Head, Navbar, Sidebar ขวามือ, Content Stage และ Camera Modal ส่วนกลาง
 */
export default function BaseLayout({
  user,
  onLogout,
  stats,
  currentView,
  onSelectView,
  isSidebarCollapsed,
  onToggleCollapse,
  selectedCamera,
  onCloseCameraModal,
  onNavigate,
  children
}) {
  return (
    <div className="dashboard-app-shell">
      {/* Top Monitoring Navbar */}
      <Navbar
        user={user}
        onLogout={onLogout}
        stats={stats}
      />

      {/* Main Stage with Center Content & Right Sidebar */}
      <div className="dashboard-main-layout">
        <main className="dashboard-center-stage">
          {children}
        </main>

        {/* Right-Hand Admin Sidebar */}
        <RightSidebar
          currentView={currentView}
          onSelectView={onSelectView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Camera Inspection Modal */}
      {selectedCamera && (
        <CameraModal
          camera={selectedCamera}
          onClose={onCloseCameraModal}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
