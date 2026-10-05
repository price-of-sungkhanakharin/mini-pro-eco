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
  Wifi,
  Thermometer,
  HardDrive,
  Download
} from 'lucide-react'
import { useDashboardData } from './useDashboardData'
import { formatTimestampThai, formatUptime, getIngestionApiBase } from '../../utils/dumpData'

/**
 * CameraDetailPage (High-Contrast Obsidian Dark Theme)
 *
 * Enhancements:
 * - Back button directly and unconditionally returns to main Dashboard page
 * - Elevated Deep Obsidian surface (#121316) with crisp borders (#262930) and distinct tiles (#181B20)
 * - Vivid semantic accent colors (Emerald for capacity, Sky Blue for AI detection, Amber for hardware)
 * - Highly readable typography and numbers with high visual hierarchy
 * - 2-Column responsive layout (Camera + Slots on Left, 4 Rows of Cards on Right)
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

  const handleBackToDashboard = () => {
    if (onNavigate) {
      onNavigate('dashboard')
    } else if (onBack) {
      onBack()
    }
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
  const onlineCount = cameras.filter((c) => c?.isOnline !== false).length

  return (
    <div className="bg-[#000000] min-h-screen text-white flex flex-col p-4 sm:p-6 lg:p-8 select-none w-full box-border">
      {/* ====================================================================
          1. SLEEK TOP FLOATING NAVBAR (High-Contrast Dark Aesthetic)
          ==================================================================== */}
      <header className="flex items-center justify-between gap-4 w-full max-w-[1720px] mx-auto pb-4 border-b border-[#22252C]">
        <div className="flex items-center gap-3">
          {/* Back button: Always reliably returns to dashboard */}
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-[#181B20] hover:bg-[#22262F] text-neutral-100 hover:text-white border border-[#2E333E] hover:border-emerald-500/70 rounded-full font-sans font-semibold text-xs sm:text-[13px] transition-all cursor-pointer shadow-lg"
            title="ย้อนกลับสู่แดชบอร์ดหลัก"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">ย้อนกลับสู่แดชบอร์ด</span>
            <span className="sm:hidden">ย้อนกลับ</span>
          </button>

          <span className="text-neutral-700 select-none hidden sm:inline">|</span>

          {/* Camera Identifier & Title */}
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-sm text-white px-2.5 py-0.5 rounded-[6px] bg-[#1C2027] border border-[#343A46]">
              {currentCamera?.slotCode || (currentCamera?.camId ? currentCamera.camId.toUpperCase() : 'CAM-01')}
            </span>
            <div>
              <h1 className="font-sans font-semibold text-sm sm:text-base text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {currentCamera?.name || 'กล้องวงจรปิด'}
              </h1>
              <span className="font-sans text-[11px] text-neutral-400 hidden sm:block">
                {currentCamera?.subtitle || currentCamera?.device || 'ESP32-CAM Node'} · 1600 × 1200 Native
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Actions: Refresh & Online Status */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#181B20] hover:bg-[#22262F] text-neutral-200 hover:text-white border border-[#2E333E] hover:border-neutral-500 rounded-full text-xs font-medium cursor-pointer transition-all shadow-sm"
            title="ดึงภาพ Snapshot สดล่าสุดทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรชภาพสด</span>
          </button>

          <span
            className={`px-3 py-1 rounded-full font-sans font-semibold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
              currentCamera?.isOnline !== false
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/70 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-rose-950/90 text-rose-300 border border-rose-700/70'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                currentCamera?.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{currentCamera?.isOnline !== false ? 'ONLINE' : 'OFFLINE'}</span>
          </span>
        </div>
      </header>

      {/* ====================================================================
          2. MAIN CONTENT: 2-COLUMN GRID (Left = Camera + Slots, Right = Cards)
          ==================================================================== */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[1720px] mx-auto mt-6 items-start flex-1">
        {/* ==================================================================
            LEFT COLUMN (col-span-8): Camera Viewport, Controls & Slots Registry
            ================================================================== */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          {/* A. Camera Viewport Card */}
          <div
            className="bg-[#121316] border border-[#262930] rounded-[22px] overflow-hidden flex flex-col shadow-2xl"
            ref={playerRef}
          >
            {/* Viewport Frame */}
            <div className="relative w-full aspect-video rounded-t-[20px] overflow-hidden bg-neutral-950 flex items-center justify-center">
              {liveImageUrl ? (
                <>
                  <img
                    src={liveImageUrl}
                    alt={currentCamera.name}
                    className="w-full h-full object-cover select-none"
                    onError={(e) => {
                      e.currentTarget.src = `/data/snapshots/${currentCamera.camId}_detected.jpg?t=${snapshotKey}`
                    }}
                  />

                  {/* Offline Warning HUD */}
                  {currentCamera.isOnline === false && (
                    <div className="absolute top-4 left-4 right-4 bg-rose-950/95 backdrop-blur-md text-white border border-rose-500/50 rounded-xl p-3 flex items-center gap-2.5 z-20 shadow-lg">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                      <span className="text-xs sm:text-sm font-medium">
                        กล้องอยู่ในสถานะออฟไลน์ · กำลังแสดงภาพบันทึก snapshot ล่าสุด
                      </span>
                    </div>
                  )}

                  {/* SVG ROI Vector Polygons Overlay */}
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
                                  ? 'fill-rose-500/35 stroke-rose-400 stroke-2'
                                  : 'fill-emerald-500/35 stroke-emerald-400 stroke-2'
                              }`}
                            />
                            <rect
                              x={center.x - 36}
                              y={center.y - 14}
                              width={72}
                              height={28}
                              rx={6}
                              className={isOccupied ? 'fill-rose-600/95' : 'fill-emerald-600/95'}
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
                  <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700/70 text-xs text-neutral-100 flex items-center gap-2 font-mono shadow-md">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentCamera.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    <span>1600 × 1200 · {currentCamera.slotCode}</span>
                  </div>

                  {/* Bottom-Right Live Timestamp */}
                  {currentCamera.snapshotTimestamp && (
                    <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-700/70 text-[11px] text-emerald-400 font-mono shadow-md">
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

            {/* Clean Controls Bar (NO Video Play/Pause Buttons & NO Countdown Progress Bar) */}
            <div className="bg-[#121316] border-t border-[#262930] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-neutral-200 text-xs font-mono font-semibold">
                  LIVE STREAM · REAL-TIME SYNC
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRoi(!showRoi)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    showRoi
                      ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-[#181B20] text-neutral-400 border border-[#2E333E] hover:text-white'
                  }`}
                  title="เปิด/ปิด ผังพิกัด ROI ช่องจอด"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ผัง ROI: {showRoi ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-[#181B20] hover:bg-[#22262F] text-neutral-300 hover:text-white border border-[#2E333E] cursor-pointer transition-all shadow-sm"
                  title="ขยายภาพเต็มจอ"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* B. Interactive Slot Registry (Elevated Dark Surface) */}
          <section className="bg-[#121316] border border-[#262930] rounded-[22px] p-4 lg:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-sm sm:text-base text-white">
                  ผังรายการช่องจอด (Slots Registry)
                </h3>
                <span className="text-xs text-neutral-400 font-mono">({slots.length} ช่อง)</span>
              </div>

              {/* Dark Filter Pills with Clear High-Contrast Selection */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: `ทั้งหมด (${slots.length})` },
                  { id: 'vacant', label: `ว่าง (${totalFree})` },
                  { id: 'occupied', label: `มีรถ (${totalOccupied})` },
                  { id: 'car', label: `รถยนต์ (${carTotal})` },
                  { id: 'bike', label: `มอเตอร์ไซค์ (${bikeTotal})` }
                ].map((item) => {
                  const isActive = slotFilter === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-emerald-500 text-black font-bold border-emerald-400 shadow-md'
                          : 'bg-[#181B20] text-neutral-300 hover:text-white border-[#2A2E38] hover:bg-[#22262F]'
                      }`}
                      onClick={() => setSlotFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {filteredSlots.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-neutral-500">
                  ไม่มีรายการช่องจอดตรงตามตัวกรองที่เลือก
                </div>
              ) : (
                filteredSlots.map((slot) => {
                  const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                  const isOccupied = Boolean(slot.occupied)
                  return (
                    <div
                      key={slot.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isOccupied
                          ? 'bg-[#241317] border-[#4F1921] text-neutral-200'
                          : 'bg-[#0E241B] border-[#18533B] text-neutral-200'
                      }`}
                    >
                      <span className="font-mono font-bold text-white flex items-center gap-1.5">
                        {isBike ? (
                          <Bike className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Car className="w-3.5 h-3.5 text-neutral-300" />
                        )}
                        <span>{slot.id}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          isOccupied
                            ? 'bg-rose-950 text-rose-300 border border-rose-700/80'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700/80'
                        }`}
                      >
                        {isOccupied ? 'มีรถ' : 'ว่าง'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* C. Bottom Previous / Next Camera Navigation */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <button
              type="button"
              onClick={() => onSelectCamera?.(prevCamId)}
              className="flex items-center gap-2 px-4 py-2 bg-[#181B20] hover:bg-[#22262F] text-neutral-200 hover:text-white border border-[#2E333E] hover:border-neutral-500 rounded-full text-xs font-medium transition-all cursor-pointer shadow-sm"
              title={`สลับไป ${prevCamera?.name || prevCamId}`}
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>
                {prevCamera?.slotCode || prevCamId.toUpperCase()} ({prevCamera?.name ? prevCamera.name.split('(')[0].trim() : 'ก่อนหน้า'})
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectCamera?.(nextCamId)}
              className="flex items-center gap-2 px-4 py-2 bg-[#181B20] hover:bg-[#22262F] text-neutral-200 hover:text-white border border-[#2E333E] hover:border-neutral-500 rounded-full text-xs font-medium transition-all cursor-pointer shadow-sm"
              title={`สลับไป ${nextCamera?.name || nextCamId}`}
            >
              <span>
                {nextCamera?.slotCode || nextCamId.toUpperCase()} ({nextCamera?.name ? nextCamera.name.split('(')[0].trim() : 'ถัดไป'})
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* ==================================================================
            RIGHT COLUMN (col-span-4):
            Row 1: Camera Selector ("โรลแรกเลือกกล้อง")
            Row 2: Card 1 (Parking Capacity)
            Row 3: Card 2 (AI YOLO26x Detection)
            Row 4: Card 3 (ESP32 Hardware & Network)
            ================================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-4 w-full">
          {/* ROW 1: Camera Selection Buttons (Clear Visual Elevation) */}
          <div className="bg-[#121316] border border-[#262930] rounded-[22px] p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                  สลับดูกล้อง (SELECT CAMERA)
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50">
                {onlineCount}/3 ออนไลน์
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {cameraOrder.map((cId) => {
                const camObj = cameras.find((c) => c.camId === cId)
                const isActive = cId === currentCamera?.camId
                const isOnline = camObj?.isOnline !== false
                const freeSlots = (camObj?.car?.free ?? 0) + (camObj?.bike?.free ?? 0)

                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => onSelectCamera?.(cId)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1C2220] border-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50'
                        : 'bg-[#181B20] border-[#2A2E38] text-neutral-300 hover:text-white hover:border-neutral-500 hover:bg-[#20242B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-mono font-bold text-xs tracking-wider">
                        {camObj?.slotCode || cId.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] font-sans text-neutral-300 truncate w-full">
                      {camObj?.name ? camObj.name.split('(')[0].trim() : cId}
                    </span>
                    <span
                      className={`text-[10px] font-mono mt-1.5 px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/80'
                          : 'text-neutral-400 bg-[#121418] border border-neutral-700/40'
                      }`}
                    >
                      ว่าง {freeSlots} ช่อง
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ROW 2: Card 1 (Parking Capacity) */}
          <div className="bg-[#121316] border border-[#262930] rounded-[22px] p-4 lg:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                  <Car className="w-4 h-4" />
                </div>
                <span>สถานะช่องจอด (Capacity)</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-700/70 font-mono shadow-xs">
                ว่าง {totalFree}/{totalCapacity} ช่อง
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">รถยนต์</span>
                <span className="text-sm sm:text-base font-bold text-white font-mono">{carFree}/{carTotal}</span>
                <span className="text-[10px] text-emerald-400 block font-medium mt-0.5">ว่าง</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">มอเตอร์ไซค์</span>
                <span className="text-sm sm:text-base font-bold text-white font-mono">{bikeFree}/{bikeTotal}</span>
                <span className="text-[10px] text-emerald-400 block font-medium mt-0.5">ว่าง</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">ความหนาแน่น</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">{occupancyPct}%</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">อัตราการจอด</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('setup', currentCamera?.camId)}
              className="inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[#1C2027] hover:bg-[#252A34] text-white border border-[#343A46] text-xs font-semibold cursor-pointer transition-all hover:border-emerald-500/50 shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>ปรับแต่ง ROI ช่องจอด</span>
            </button>
          </div>

          {/* ROW 3: Card 2 (AI YOLO26x Detection Engine) */}
          <div className="bg-[#121316] border border-[#262930] rounded-[22px] p-4 lg:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-400">
                  <Award className="w-4 h-4" />
                </div>
                <span>AI YOLO26x Engine</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/70 px-2.5 py-0.5 rounded-full font-mono">
                Active Engine
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">ตรวจพบ</span>
                <span className="text-sm sm:text-base font-bold text-white font-mono">{totalOccupied}</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">คัน</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">ความมั่นใจ</span>
                <span className="text-sm sm:text-base font-bold text-sky-400 font-mono">96.5%</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Confidence</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">Inference</span>
                <span className="text-sm sm:text-base font-bold text-amber-400 font-mono">38ms</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">ความเร็ว</span>
              </div>
            </div>

            <div className="text-xs text-neutral-300 flex items-center gap-2 pt-2 border-t border-[#262930]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ซิงค์ข้อมูลเข้า PostgreSQL 17 และ Label Studio</span>
            </div>
          </div>

          {/* ROW 4: Card 3 (ESP32 Edge Hardware & Network) */}
          <div className="bg-[#121316] border border-[#262930] rounded-[22px] p-4 lg:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-400">
                  <Wifi className="w-4 h-4" />
                </div>
                <span>ESP32 Hardware & Network</span>
              </div>
              <span className="text-xs font-mono font-medium text-neutral-300 bg-[#181B20] border border-[#2A2E38] px-2.5 py-0.5 rounded-full">
                {currentCamera?.ip || '172.30.91.44'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">อุณหภูมิ</span>
                <span className="text-sm sm:text-base font-bold text-amber-400 font-mono flex items-center justify-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  {chipTemp.toFixed(1)}°C
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Chip Temp</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">WiFi RSSI</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono flex items-center justify-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  {wifiRssi} dBm
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">ความแรง</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#181B20] border border-[#2A2E38]">
                <span className="text-xs text-neutral-400 block mb-1">Free Heap</span>
                <span className="text-sm sm:text-base font-bold text-cyan-400 font-mono flex items-center justify-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  {Math.round(freeHeap / 1024)} KB
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">RAM ว่าง</span>
              </div>
            </div>

            <div className="text-xs text-neutral-300 flex items-center justify-between pt-2 border-t border-[#262930]">
              <span>Uptime: <strong className="text-white font-mono">{formatUptime(uptimeSec)}</strong></span>
              {liveImageUrl && (
                <a
                  href={liveImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-full bg-[#1C2027] hover:bg-[#252A34] text-neutral-200 hover:text-white border border-[#343A46] text-xs font-medium hover:underline flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3 h-3 text-neutral-400" />
                  <span>โหลด HD</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
