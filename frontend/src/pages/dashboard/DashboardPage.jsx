import React from 'react'
import { useDashboardData } from './useDashboardData'
import DashboardHeader from './sections/DashboardHeader.jsx'
import DashboardKpis from './sections/DashboardKpis.jsx'
import CameraMapCard from './sections/CameraMapCard.jsx'
import DensityForecastCard from './sections/DensityForecastCard.jsx'
import CameraHealthCard from './sections/CameraHealthCard.jsx'
import ZoneAlertsCard from './sections/ZoneAlertsCard.jsx'
import ModelPipelineCard from './sections/ModelPipelineCard.jsx'

export default function DashboardPage({ onOpenModal, onNavigate }) {
  const {
    countdown,
    isRefreshing,
    handleManualRefresh,
    cam1,
    cam2,
    cam3,
    cam1Counts,
    cam2Counts,
    cam3Counts,
    totalCarFree,
    totalCarTotal,
    totalBikeFree,
    totalBikeTotal
  } = useDashboardData()

  const cameras = [cam1, cam2, cam3]
  const onlineCount = cameras.filter((c) => c?.isOnline).length
  const totalCapacity = (totalCarTotal || 0) + (totalBikeTotal || 0)
  const totalFree = (totalCarFree || 0) + (totalBikeFree || 0)
  const occupiedCount = Math.max(0, totalCapacity - totalFree)
  const occupancyPct = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 68

  // Calculate alerts (nearly full, full, or offline)
  const offlineCount = Math.max(0, cameras.length - onlineCount)
  let activeAlerts = offlineCount
  if (cam1Counts?.car?.free <= 1) activeAlerts++
  if (cam2Counts?.car?.free <= 1) activeAlerts++
  if (cam3Counts?.bike?.free <= 3) activeAlerts++

  return (
    <div className="flex flex-col items-start px-4 sm:px-6 lg:px-10 py-6 gap-6 w-full max-w-[1440px] mx-auto box-border">
      {/* 1. Header with Demo Badge & Actions */}
      <DashboardHeader
        onlineCount={onlineCount}
        countdown={countdown}
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
      />

      {/* 2. 4-KPI Row */}
      <DashboardKpis
        onlineCount={onlineCount}
        totalCameras={cameras.length}
        occupancyPct={occupancyPct}
        occupiedCount={occupiedCount}
        totalCapacity={totalCapacity}
        hourlyDetections={1284}
        precisionPct={98}
        alertCount={activeAlerts}
        alertText={
          offlineCount > 0
            ? `${offlineCount} กล้องเสี่ยงดับ`
            : occupancyPct >= 75
              ? 'โซนความหนาแน่นสูง'
              : 'สถานะปกติทุกจุด'
        }
      />

      {/* 3. Main Row (Left: ~860px / flex-1, Right: ~380px) */}
      <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
        {/* Left Column */}
        <div className="flex flex-col gap-6 flex-1 min-w-0 w-full">
          {/* Camera Map & Grid Card */}
          <CameraMapCard
            cameras={cameras}
            onOpenModal={onOpenModal}
            onNavigate={onNavigate}
          />

          {/* Bottom Row under Camera Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            <div className="lg:col-span-7">
              <DensityForecastCard />
            </div>
            <div className="lg:col-span-5">
              <CameraHealthCard cameras={cameras} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 w-full xl:w-[380px] shrink-0">
          {/* Card 1: Risk & Zone Alerts */}
          <ZoneAlertsCard
            cam1Counts={cam1Counts}
            cam2Counts={cam2Counts}
            cam3Counts={cam3Counts}
          />

          {/* Card 2: Model & Time-Series Info */}
          <ModelPipelineCard onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  )
}
