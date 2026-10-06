import React, { useState } from 'react'
import { useDashboardData } from './useDashboardData'
import { getIngestionApiBase } from '../../utils/dumpData'
import Modal from '../../components/ui/Modal.jsx'
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

  const [inspectCamera, setInspectCamera] = useState(null)
  const [inspectMode, setInspectMode] = useState('dashboard') // 'dashboard' | 'raw'
  const [inspectDims, setInspectDims] = useState({ width: 0, height: 0 })

  const handleOpenInspect = (cam) => {
    setInspectCamera(cam)
    setInspectDims({ width: 0, height: 0 })
  }

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
    <div className="flex flex-col items-start px-1 sm:px-6 lg:px-10 py-3 sm:py-6 gap-5 sm:gap-6 w-full max-w-[1440px] mx-auto box-border overflow-hidden">
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
            onOpenModal={handleOpenInspect}
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

      {/* Lightbox / Image Inspection Modal on Dashboard */}
      {inspectCamera && (
        <Modal
          isOpen={Boolean(inspectCamera)}
          onClose={() => setInspectCamera(null)}
          title={`ภาพขยายสด · ${inspectCamera.slotCode || 'CAM'}`}
          subtitle={inspectCamera.name}
          badge={
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                inspectCamera.isOnline
                  ? 'bg-[#EAF6E8] text-[#4F6B4A]'
                  : 'bg-[#FDECEC] text-[#A33A3A]'
              }`}
            >
              {inspectCamera.isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          }
          size="2xl"
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {inspectCamera.car?.total > 0 && (
                  <span className="bg-[#FAF8EF] border border-[#CFCFC4] px-2.5 py-1 rounded-full font-medium text-[#30312F]">
                    รถยนต์ว่าง: <strong className="text-[#4F6B4A]">{inspectCamera.car.free}</strong>/{inspectCamera.car.total}
                  </span>
                )}
                {inspectCamera.bike?.total > 0 && (
                  <span className="bg-[#FAF8EF] border border-[#CFCFC4] px-2.5 py-1 rounded-full font-medium text-[#30312F]">
                    มอเตอร์ไซค์ว่าง: <strong className="text-[#4F6B4A]">{inspectCamera.bike.free}</strong>/{inspectCamera.bike.total}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectCamera(null)}
                  className="px-4 py-2 rounded-full border border-[#CFCFC4] bg-[#FFFFFF] hover:bg-[#FAF8EF] text-[#30312F] text-xs font-semibold cursor-pointer transition-all"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = inspectCamera.camId || (inspectCamera.slotCode ? inspectCamera.slotCode.toLowerCase().replace('-', '') : 'cam1')
                    setInspectCamera(null)
                    onNavigate?.('camera_detail', targetId)
                  }}
                  className="px-4 py-2 rounded-full bg-[#30312F] hover:bg-[#454743] text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>เปิดดูกล้องแยก & ผังช่องจอด</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-3.5">
            {/* Mode Toggle & Dimensions Chip */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 bg-[#F4F1E8] rounded-full border border-[#DEDED2]">
                <button
                  type="button"
                  onClick={() => setInspectMode('dashboard')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    inspectMode === 'dashboard'
                      ? 'bg-[#FFFFFF] text-[#30312F] shadow-2xs'
                      : 'text-[#85847E] hover:text-[#30312F]'
                  }`}
                >
                  ตรวจจับ AI (YOLO)
                </button>
                <button
                  type="button"
                  onClick={() => setInspectMode('raw')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    inspectMode === 'raw'
                      ? 'bg-[#FFFFFF] text-[#30312F] shadow-2xs'
                      : 'text-[#85847E] hover:text-[#30312F]'
                  }`}
                >
                  ภาพต้นฉบับ (RAW)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#85847E] bg-[#FAF8EF] px-3 py-1 rounded-full border border-[#DEDED2]">
                  {inspectDims.width > 0 ? `${inspectDims.width} × ${inspectDims.height} px` : 'กำลังตรวจสอบ...'}
                </span>
                <span className="font-mono text-xs text-[#4F6B4A] bg-[#EAF6E8] px-2.5 py-1 rounded-full">
                  LIVE
                </span>
              </div>
            </div>

            {/* High-res Image Viewport */}
            <div className="relative w-full aspect-video rounded-[16px] overflow-hidden border border-[#DEDED2] bg-[#121316] flex items-center justify-center shadow-inner">
              <img
                src={`${getIngestionApiBase()}/api/v1/line/snapshot/${inspectCamera.camId}?mode=${inspectMode}&t=${Date.now()}`}
                alt={inspectCamera.name}
                className="w-full h-full object-contain"
                onLoad={(e) => {
                  if (e.target.naturalWidth && e.target.naturalHeight) {
                    setInspectDims({
                      width: e.target.naturalWidth,
                      height: e.target.naturalHeight
                    })
                  }
                }}
                onError={(e) => {
                  const apiBase = getIngestionApiBase()
                  e.currentTarget.src = `${apiBase}/api/latest?camera_id=${inspectCamera.camId}&image=true`
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
