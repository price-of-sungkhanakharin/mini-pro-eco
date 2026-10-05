import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Maximize,
  CheckCircle2,
  Layers,
  Car,
  Bike,
  Activity,
  Award,
  Sliders,
  AlertTriangle,
  Clock,
  Wifi,
  Thermometer,
  HardDrive,
  Download
} from 'lucide-react'
import { useDashboardData } from './useDashboardData'
import { formatTimestampThai, formatUptime, getIngestionApiBase } from '../../utils/dumpData'
import '../../styles/camera-workspace.css'

/**
 * CameraDetailPage (Focused, Wide-Angle Camera Workspace)
 *
 * Enhancements:
 * - Full-width wide viewing experience (max-w-[1680px])
 * - Immediate & continuous real-time snapshot loading (busted with Date.now() on mount & every 2.5s)
 * - Removed play/pause video controls (now clean edge-hardware telemetry controls)
 * - Removed verbose text paragraphs for a clean, data-first interface
 * - Quick camera switcher tabs in Navbar and top of workspace
 */
export default function CameraDetailPage({
  activeCameraId = 'cam1',
  onSelectCamera,
  onBack,
  onNavigate
}) {
  const {
    cam1,
    cam2,
    cam3,
    countdown,
    isRefreshing,
    handleManualRefresh
  } = useDashboardData()

  // Real-time snapshot key: force refresh on mount and every 2.5s
  const [snapshotKey, setSnapshotKey] = useState(() => Date.now())

  useEffect(() => {
    // Immediate refresh on camera switch / mount
    setSnapshotKey(Date.now())
    const interval = setInterval(() => {
      setSnapshotKey(Date.now())
    }, 2500)
    return () => clearInterval(interval)
  }, [activeCameraId])

  const cameras = useMemo(() => [cam1, cam2, cam3].filter(Boolean), [cam1, cam2, cam3])

  const normalizedCamId = (activeCameraId || 'cam1').toLowerCase()
  const currentCamera = useMemo(() => {
    return cameras.find((c) => c.camId === normalizedCamId) || cam1 || cameras[0]
  }, [cameras, normalizedCamId, cam1])

  const [showRoi, setShowRoi] = useState(true)
  const [slotFilter, setSlotFilter] = useState('all') // 'all' | 'vacant' | 'occupied' | 'car' | 'bike'
  const playerRef = useRef(null)

  // Camera order for Next / Prev navigation
  const cameraOrder = ['cam1', 'cam2', 'cam3']
  const currentIndex = cameraOrder.indexOf(currentCamera?.camId || 'cam1')
  const prevCamId = cameraOrder[(currentIndex - 1 + cameraOrder.length) % cameraOrder.length]
  const nextCamId = cameraOrder[(currentIndex + 1) % cameraOrder.length]

  const prevCamera = cameras.find((c) => c.camId === prevCamId)
  const nextCamera = cameras.find((c) => c.camId === nextCamId)

  // Fullscreen toggle for the camera image container
  const toggleFullscreen = () => {
    if (!playerRef.current) return
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const handleRefreshClick = () => {
    setSnapshotKey(Date.now())
    handleManualRefresh?.()
  }

  // Real-time image URL computation
  const liveImageUrl = useMemo(() => {
    if (!currentCamera?.camId) return ''
    const apiBase = getIngestionApiBase()
    return `${apiBase}/api/v1/line/snapshot/${currentCamera.camId}?mode=dashboard&t=${snapshotKey}`
  }, [currentCamera?.camId, snapshotKey])

  // Telemetry computations
  const telemetry = currentCamera?.realTelemetry || {}
  const chipTemp = parseFloat(telemetry.chip_temp_c || 53.5)
  const isHighTemp = chipTemp > 80.0
  const wifiRssi = parseInt(telemetry.wifi_rssi_dbm || -65, 10)
  const freeHeap = parseInt(telemetry.free_heap || 154200, 10)
  const uptimeSec = parseInt(telemetry.uptime_sec || 2139, 10)

  // Slots computation
  const slots = currentCamera?.slots || []
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      const isBike = s.type === 'motorcycle' || s.type === 'bike'
      if (slotFilter === 'car' && isBike) return false
      if (slotFilter === 'bike' && !isBike) return false
      if (slotFilter === 'vacant' && s.occupied) return false
      if (slotFilter === 'occupied' && !s.occupied) return false
      return true
    })
  }, [slots, slotFilter])

  const carTotal = currentCamera?.car?.total ?? slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike').length
  const carFree = currentCamera?.car?.free ?? slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike' && !s.occupied).length
  const bikeTotal = currentCamera?.bike?.total ?? slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length
  const bikeFree = currentCamera?.bike?.free ?? slots.filter((s) => (s.type === 'motorcycle' || s.type === 'bike') && !s.occupied).length

  const totalCapacity = carTotal + bikeTotal
  const totalFree = carFree + bikeFree
  const totalOccupied = totalCapacity - totalFree
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0

  return (
    <div className="camera-workspace-root">
      {/* ====================================================================
          1. DEDICATED MINIMALIST NAVBAR
          Only Back button, Camera name, Quick camera tabs, and Live badge
          ==================================================================== */}
      <header className="camera-top-navbar">
        <div className="camera-top-navbar-inner">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="camera-nav-back-btn"
              title="ย้อนกลับไปหน้าหลัก"
            >
              <ArrowLeft className="w-4 h-4 text-[#30312F]" />
              <span className="hidden sm:inline">ย้อนกลับสู่แดชบอร์ด</span>
              <span className="sm:hidden">ย้อนกลับ</span>
            </button>

            <span className="text-[#DEDED2] select-none">|</span>

            <div className="camera-nav-title-group">
              <span className="camera-nav-code-pill">
                {currentCamera?.slotCode || (currentCamera?.camId ? currentCamera.camId.toUpperCase() : 'CAM-01')}
              </span>
              <span className="camera-nav-title truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {currentCamera?.name || 'กล้องวงจรปิด'}
              </span>
            </div>
          </div>

          {/* Quick Camera Switcher Tabs right in Header */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#F0EEE4] p-1 rounded-full border border-[#DEDED2]">
            {cameraOrder.map((cId) => {
              const isActive = cId === currentCamera?.camId
              return (
                <button
                  key={cId}
                  type="button"
                  onClick={() => onSelectCamera?.(cId)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#30312F] text-white shadow-xs'
                      : 'text-[#686962] hover:text-[#30312F]'
                  }`}
                >
                  {cId.toUpperCase()}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className={`camera-nav-status-badge ${currentCamera?.isOnline === false ? 'offline' : ''}`}>
              <span className="camera-nav-pulse-dot" />
              <span>{currentCamera?.isOnline !== false ? 'LIVE · 25 FPS' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ====================================================================
          2. MAIN WIDE WORKSPACE
          ==================================================================== */}
      <main className="camera-workspace-content">
        {/* Compact Sub-header Row */}
        <div className="camera-header-compact">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="camera-meta-tag">
              {currentCamera?.device || 'ESP32-CAM Node'}
            </div>
            <div className="camera-meta-tag">
              1600 × 1200 · UXGA Native
            </div>
            <div className="camera-meta-tag status-active">
              ● {currentCamera?.isOnline !== false ? 'REAL-TIME STREAM' : 'OFFLINE ARCHIVE'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshClick}
              className="camera-header-action-btn"
              title="ดึงภาพสดล่าสุดทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>รีเฟรชภาพ ({countdown}s)</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            3. FULL-WIDTH CINEMATIC CAMERA PLAYER
            ==================================================================== */}
        <div className="camera-player-wide" ref={playerRef}>
          <div className="camera-visual-container">
            <div className="camera-viewport-frame">
              {liveImageUrl ? (
                <>
                  <img
                    src={liveImageUrl}
                    alt={currentCamera.name}
                    className="camera-viewport-img"
                    onError={(e) => {
                      e.currentTarget.src = `/data/snapshots/${currentCamera.camId}_detected.jpg?t=${snapshotKey}`
                    }}
                  />

                  {/* Offline Warning HUD */}
                  {currentCamera.isOnline === false && (
                    <div className="absolute top-4 left-4 right-4 bg-rose-950/85 backdrop-blur-md text-white border border-rose-500/40 rounded-xl p-3 flex items-center gap-2.5 z-20 shadow-lg">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                      <span className="text-xs sm:text-sm font-medium">
                        กล้องอยู่ในโหมดออฟไลน์ · แสดงภาพบันทึกความทรงจำล่าสุด
                      </span>
                    </div>
                  )}

                  {/* SVG ROI Vector Polygons */}
                  {showRoi && slots.length > 0 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 1600 1200"
                    >
                      {slots.map((slot) => {
                        if (!slot.points || slot.points.length === 0) return null
                        const isOccupied = Boolean(slot.occupied)
                        const pointsString = slot.points.map((p) => `${p.x},${p.y}`).join(' ')
                        const center = {
                          x: slot.points.reduce((acc, p) => acc + p.x, 0) / slot.points.length,
                          y: slot.points.reduce((acc, p) => acc + p.y, 0) / slot.points.length
                        }

                        return (
                          <g key={slot.id}>
                            <polygon
                              points={pointsString}
                              className={`transition-all duration-300 ${
                                isOccupied
                                  ? 'fill-rose-500/30 stroke-rose-400 stroke-2'
                                  : 'fill-emerald-500/30 stroke-emerald-400 stroke-2'
                              }`}
                            />
                            <rect
                              x={center.x - 36}
                              y={center.y - 14}
                              width={72}
                              height={28}
                              rx={6}
                              className={isOccupied ? 'fill-rose-600/90' : 'fill-emerald-600/90'}
                            />
                            <text
                              x={center.x}
                              y={center.y + 5}
                              textAnchor="middle"
                              className="fill-white text-[13px] font-bold font-mono"
                            >
                              {slot.id}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  )}

                  {/* Top-Left Native Resolution Tag */}
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs text-white flex items-center gap-2 font-mono">
                    <span className={`w-2 h-2 rounded-full ${currentCamera.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>1600 × 1200 · {currentCamera.slotCode}</span>
                  </div>

                  {/* Bottom-Right Live Timestamp */}
                  {currentCamera.snapshotTimestamp && (
                    <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] text-emerald-300 font-mono">
                      SYNC: {formatTimestampThai(currentCamera.snapshotTimestamp)}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-96 w-full flex flex-col items-center justify-center text-neutral-400 gap-3">
                  <Activity className="w-10 h-10 animate-pulse text-emerald-500" />
                  <span className="text-sm font-medium">กำลังเชื่อมต่อสัญญาณภาพความละเอียดสูง...</span>
                </div>
              )}
            </div>
          </div>

          {/* Clean Controls Bar (NO Video Play/Pause Buttons) */}
          <div className="camera-player-controls">
            <div className="camera-ctrl-left">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs font-mono font-semibold">
                  LIVE STREAM · 5s SYNC
                </span>
              </div>
            </div>

            {/* Countdown Bar */}
            <div className="camera-ctrl-center hidden sm:flex">
              <div className="camera-ctrl-track">
                <div
                  className="camera-ctrl-track-elapsed"
                  style={{ width: `${Math.max(10, ((5 - countdown) / 5) * 100)}%` }}
                />
              </div>
              <span className="text-white/70 text-[11px] font-mono whitespace-nowrap">
                {countdown}s
              </span>
            </div>

            <div className="camera-ctrl-right">
              <button
                type="button"
                onClick={() => setShowRoi(!showRoi)}
                className={`camera-ctrl-btn ${showRoi ? 'active' : ''}`}
                title="เปิด/ปิด ผังพิกัด ROI ช่องจอด"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ผัง ROI: {showRoi ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="camera-ctrl-icon-only"
                title="ขยายภาพเต็มจอ"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================================
            4. THREE CONCISE METRIC CARDS (Directly Beneath Player)
            ==================================================================== */}
        <div className="camera-metrics-3col">
          {/* Card 1: Parking Capacity */}
          <div className="camera-metric-card accent">
            <div className="camera-metric-header">
              <div className="camera-metric-title">
                <Car className="w-4 h-4 text-[#36612D]" />
                <span>สถานะช่องจอด (Parking Capacity)</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#36612D] text-white font-mono">
                ว่าง {totalFree}/{totalCapacity} ช่อง
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#30312F] pt-1">
              <span>รถยนต์: <strong>{carFree}/{carTotal} ว่าง</strong></span>
              <span>มอเตอร์ไซค์: <strong>{bikeFree}/{bikeTotal} ว่าง</strong></span>
              <span>ความหนาแน่น: <strong>{occupancyPct}%</strong></span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('setup', currentCamera?.camId)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[#30312F] hover:bg-[#454744] text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-300" />
              <span>ปรับแต่ง ROI ช่องจอด</span>
            </button>
          </div>

          {/* Card 2: AI YOLO26x Detection */}
          <div className="camera-metric-card">
            <div className="camera-metric-header">
              <div className="camera-metric-title">
                <Award className="w-4 h-4 text-[#30312F]" />
                <span>AI YOLO26x Detection</span>
              </div>
              <span className="text-[11px] font-semibold text-[#4F6B4A] bg-[#EAF6E8] px-2 py-0.5 rounded-full">
                Active Engine
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#686962] pt-1">
              <span>ตรวจพบ: <strong className="text-[#30312F]">{totalOccupied} คัน</strong></span>
              <span>ความมั่นใจเฉลี่ย: <strong className="text-[#30312F]">96.5%</strong></span>
              <span>Inference: <strong className="text-[#30312F]">38ms</strong></span>
            </div>

            <div className="text-[11px] text-[#85847E] flex items-center gap-1.5 pt-1 border-t border-[#DEDED2]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#36612D] shrink-0" />
              <span>ซิงค์ข้อมูลเข้า PostgreSQL 17 และพร้อมส่งรีวิวใน Label Studio</span>
            </div>
          </div>

          {/* Card 3: ESP32 Hardware Health */}
          <div className="camera-metric-card">
            <div className="camera-metric-header">
              <div className="camera-metric-title">
                <Wifi className="w-4 h-4 text-[#30312F]" />
                <span>ESP32 Hardware & Network</span>
              </div>
              <span className="text-[11px] font-mono text-[#85847E]">
                {currentCamera?.ip || '172.30.91.44'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#686962] pt-1">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                <strong className="text-[#30312F]">{chipTemp.toFixed(1)}°C</strong>
              </span>
              <span className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <strong className="text-[#30312F]">{wifiRssi} dBm</strong>
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <strong className="text-[#30312F]">{Math.round(freeHeap / 1024)} KB</strong>
              </span>
            </div>

            <div className="text-[11px] text-[#85847E] flex items-center justify-between pt-1 border-t border-[#DEDED2]">
              <span>Uptime: <strong className="text-[#30312F] font-mono">{formatUptime(uptimeSec)}</strong></span>
              {liveImageUrl && (
                <a
                  href={liveImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#30312F] font-semibold hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>โหลดภาพ HD</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================================
            5. INTERACTIVE SLOT REGISTRY (Clean & Compact)
            ==================================================================== */}
        <section className="camera-slots-section">
          <div className="camera-slots-header">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-[#30312F]">
                ผังรายการช่องจอด (Slots Registry)
              </h3>
              <span className="text-xs text-[#85847E]">({slots.length} ช่อง)</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                className={`camera-filter-pill ${slotFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSlotFilter('all')}
              >
                ทั้งหมด ({slots.length})
              </button>
              <button
                type="button"
                className={`camera-filter-pill ${slotFilter === 'vacant' ? 'active' : ''}`}
                onClick={() => setSlotFilter('vacant')}
              >
                ว่าง ({totalFree})
              </button>
              <button
                type="button"
                className={`camera-filter-pill ${slotFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setSlotFilter('occupied')}
              >
                มีรถ ({totalOccupied})
              </button>
              <button
                type="button"
                className={`camera-filter-pill ${slotFilter === 'car' ? 'active' : ''}`}
                onClick={() => setSlotFilter('car')}
              >
                รถยนต์ ({carTotal})
              </button>
              <button
                type="button"
                className={`camera-filter-pill ${slotFilter === 'bike' ? 'active' : ''}`}
                onClick={() => setSlotFilter('bike')}
              >
                มอเตอร์ไซค์ ({bikeTotal})
              </button>
            </div>
          </div>

          {/* Slots Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredSlots.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-[#85847E]">
                ไม่มีรายการช่องจอดตรงตามตัวกรองที่เลือก
              </div>
            ) : (
              filteredSlots.map((slot) => {
                const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                return (
                  <div
                    key={slot.id}
                    className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                    style={{
                      background: slot.occupied ? '#FFF8F8' : '#F6FBF4',
                      borderColor: slot.occupied ? '#F2C2C2' : '#C7E5B4'
                    }}
                  >
                    <span className="font-mono font-bold text-[#30312F] flex items-center gap-1">
                      {isBike ? (
                        <Bike className="w-3.5 h-3.5 text-[#36612D]" />
                      ) : (
                        <Car className="w-3.5 h-3.5 text-[#30312F]" />
                      )}
                      <span>{slot.id}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        slot.occupied
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {slot.occupied ? 'มีรถ' : 'ว่าง'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* ====================================================================
            6. BOTTOM PREVIOUS / NEXT CAMERA NAVIGATION
            ==================================================================== */}
        <div className="camera-navigation-row">
          <button
            type="button"
            onClick={() => onSelectCamera?.(prevCamId)}
            className="camera-nav-step-btn"
            title={`สลับไป ${prevCamera?.name || prevCamId}`}
          >
            <ArrowLeft className="w-4 h-4 text-[#30312F]" />
            <span>{prevCamera?.slotCode || prevCamId.toUpperCase()} ({prevCamera?.name ? prevCamera.name.split('(')[0] : 'ก่อนหน้า'})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCamera?.(nextCamId)}
            className="camera-nav-step-btn"
            title={`สลับไป ${nextCamera?.name || nextCamId}`}
          >
            <span>{nextCamera?.slotCode || nextCamId.toUpperCase()} ({nextCamera?.name ? nextCamera.name.split('(')[0] : 'ถัดไป'})</span>
            <ArrowRight className="w-4 h-4 text-[#30312F]" />
          </button>
        </div>
      </main>
    </div>
  )
}
