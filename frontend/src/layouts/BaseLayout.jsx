import React, { useState } from 'react'
import Navbar from '../components/navigation/Navbar.jsx'
import RightSidebar from '../components/navigation/RightSidebar.jsx'
import CameraModal from '../components/ui/CameraModal.jsx'

/**
 * BaseLayout (Editorial Light Bento SaaS Layout Shell)
 * - Sticky Top Navbar: 2-Row (112px) on Desktop (>=1024px), 1-Row (72px) on Mobile (<1024px)
 * - Single full-width main content stage on desktop (max-width 1240px centered, 32px 40px padding)
 * - Responsive slide-in drawer (< 1024px)
 * - Global Camera Inspection Modal
 */
export default function BaseLayout({
  user,
  onLogout,
  stats,
  currentView,
  onSelectView,
  selectedCamera,
  onCloseCameraModal,
  onNavigate,
  children
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  const handleSelectView = (view) => {
    onSelectView(view)
    setIsMobileDrawerOpen(false)
  }

  return (
    <div className="dashboard-app-shell">
      {/* Top Sticky Navbar */}
      <Navbar
        user={user}
        onLogout={onLogout}
        stats={stats}
        currentView={currentView}
        onSelectView={handleSelectView}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      {/* Main Layout: Single Column Stage on Desktop, Drawer on Mobile */}
      <div className="dashboard-main-layout">
        <main className="dashboard-center-stage" id="main-content-stage">
          <div className="dashboard-center-inner">
            <div key={currentView} className="anim-page">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Slide-In Navigation Drawer (< 1024px) */}
        <RightSidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
      </div>

      {/* High-Resolution Camera Inspection Modal Overlay */}
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
