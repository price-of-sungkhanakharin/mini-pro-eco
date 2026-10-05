import React from 'react'
import { useDashboardData } from './useDashboardData'
import ViewControlBar from './sections/ViewControlBar.jsx'
import HeroCamera from './sections/HeroCamera.jsx'
import SecondaryCamera from './sections/SecondaryCamera.jsx'
import AiForecast from './sections/AiForecast.jsx'
import EdgeTelemetry from './sections/EdgeTelemetry.jsx'
import ZoneBreakdown from './sections/ZoneBreakdown.jsx'
import LogTicker from './sections/LogTicker.jsx'

export default function DashboardPage({ onOpenModal, onNavigate }) {
  const {
    selectedZone,
    setSelectedZone,
    countdown,
    isRefreshing,
    handleManualRefresh,
    showRoiOverlay,
    setShowRoiOverlay,
    cam1,
    cam2,
    cam3,
    cam1Counts,
    cam2Counts,
    cam3Counts,
    cam1Live,
    totalCarFree,
    totalCarTotal,
    totalBikeFree,
    totalBikeTotal,
    avgChance,
    currentRecord
  } = useDashboardData()

  const onlineCount = [cam1?.isOnline, cam2?.isOnline, cam3?.isOnline].filter(Boolean).length

  return (
    <div className="dashboard-container">
      {/* S0: ViewControlBar + 4-KPI Strip */}
      <ViewControlBar
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
        countdown={countdown}
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
        totalCarFree={totalCarFree}
        totalCarTotal={totalCarTotal}
        totalBikeFree={totalBikeFree}
        totalBikeTotal={totalBikeTotal}
        avgChance={avgChance}
        onlineCount={onlineCount}
      />

      {/* S1: 3-Camera Grid (CAM-01, CAM-02, CAM-03 in 3 equal columns >=1280px) */}
      <div className="dashboard-camera-grid">
        <HeroCamera
          cam1={cam1}
          showRoiOverlay={showRoiOverlay}
          onToggleRoi={() => setShowRoiOverlay((prev) => !prev)}
          onOpenModal={onOpenModal}
          onNavigate={onNavigate}
        />

        <SecondaryCamera
          camera={cam2}
          onOpenModal={onOpenModal}
          onNavigate={onNavigate}
        />

        <SecondaryCamera
          camera={cam3}
          onOpenModal={onOpenModal}
          onNavigate={onNavigate}
        />
      </div>

      {/* S2: AiForecast + EdgeTelemetry (2 equal columns >=1024px, align-items: start) */}
      <div className="dashboard-ai-grid">
        <AiForecast
          avgChance={avgChance}
          totalCarFree={totalCarFree}
          totalCarTotal={totalCarTotal}
          totalBikeFree={totalBikeFree}
          totalBikeTotal={totalBikeTotal}
        />

        <EdgeTelemetry
          currentRecord={currentRecord}
        />
      </div>

      {/* S3: ZoneBreakdown + LogTicker (2 equal columns >=1024px) */}
      <div className="dashboard-breakdown-grid">
        <ZoneBreakdown
          cam1Counts={cam1Counts}
          cam2Counts={cam2Counts}
          cam3Counts={cam3Counts}
        />

        <LogTicker
          currentRecord={currentRecord}
          cam1Live={cam1Live}
        />
      </div>
    </div>
  )
}
