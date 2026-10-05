import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Play,
  Pause,
  Maximize,
  Volume2,
  Check,
  CheckCircle2,
  Layers,
  Car,
  Bike,
  Activity,
  Award,
  ExternalLink,
  Sliders,
  AlertTriangle,
  Clock,
  Wifi,
  Thermometer,
  HardDrive,
  Download
} from 'lucide-react'
import { useDashboardData } from './useDashboardData'
import { formatTimestampThai, formatUptime, formatHeapKb } from '../../utils/dumpData'
import '../../styles/camera-workspace.css'

/**
 * CameraDetailPage (Dedicated Camera Workspace View)
 *
 * Implements the Figma Auto-Layout specifications:
 * - Minimalist Top Navbar (Back button + Camera name only)
 * - Breadcrumb navigation
 * - Metadata tags, 48px Title, Description, Refresh action
 * - Learning Surface 2-column layout:
 *   - Left: Lesson Player (Stream view, 3-block pipeline, controls), Heading, Filters, Slot Registry, Takeaways, Prev/Next
 *   - Right: Curriculum (All cameras list with active highlight), Reward (YOLO Edge), Resources (Snapshot/Logs)
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

  // Find active camera data
  const cameras = useMemo(() => [cam1, cam2, cam3].filter(Boolean), [cam1, cam2, cam3])

  const normalizedCamId = (activeCameraId || 'cam1').toLowerCase()
  const currentCamera = useMemo(() => {
    return cameras.find((c) => c.camId === normalizedCamId) || cam1 || cameras[0]
  }, [cameras, normalizedCamId, cam1])

  const [isPlaying, setIsPlaying] = useState(true)
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
          1. DEDICATED MINIMALIST CAMERA NAVBAR
          Only Back button and Camera name as requested
          ==================================================================== */}
      <header className="camera-top-navbar">
        <div className="camera-top-navbar-inner">
          <div className="flex items-center gap-3 sm:gap-4">
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
              <span className="camera-nav-title truncate max-w-[200px] sm:max-w-md">
                {currentCamera?.name || 'กล้องวงจรปิด'}
              </span>
            </div>
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
          2. MAIN WORKSPACE CONTAINER
          ==================================================================== */}
      <main className="camera-workspace-content">
        {/* Breadcrumb */}
        <nav className="camera-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={onBack}
            className="camera-breadcrumb-link"
          >
            แดชบอร์ด
          </button>
          <span>/</span>
          <span>กล้องวงจรปิด</span>
          <span>/</span>
          <span className="text-[#30312F] font-semibold">
            {currentCamera?.slotCode || currentCamera?.camId?.toUpperCase()}
          </span>
        </nav>

        {/* Camera Introduction */}
        <section className="camera-intro-row">
          <div className="camera-overview-block">
            {/* Metadata Tags */}
            <div className="camera-metadata-row">
              <div className="camera-meta-tag">
                {currentCamera?.device || 'ESP32-CAM Node'}
              </div>
              <div className="camera-meta-tag">
                1600 × 1200 · UXGA Native
              </div>
              <div className="camera-meta-tag status-active">
                ● {currentCamera?.isOnline !== false ? 'ONLINE · 5s SYNC' : 'OFFLINE ARCHIVE'}
              </div>
            </div>

            {/* Title */}
            <h1 className="camera-title-headline">
              {currentCamera?.slotCode}: {currentCamera?.name}
            </h1>

            {/* Description */}
            <p className="camera-desc-text">
              {currentCamera?.subtitle || 'กล้องตรวจจับพาหนะและประเมินความหนาแน่นช่องจอดรถแบบ Real-Time'}
              {' '}เชื่อมต่อโครงข่าย ESP32 Ingestion Ingestion (:5005) และโมเดลวิเคราะห์ YOLO26x สำหรับระบบ Smart Parking
            </p>
          </div>

          {/* Top Right Header Action Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            className="camera-header-action-btn"
            title="รีเฟรชสัญญาณภาพและสถิติล่าสุด"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรชภาพสด ({countdown}s)</span>
          </button>
        </section>

        {/* ====================================================================
            3. LEARNING SURFACE: 2-COLUMN WORKSPACE
            ==================================================================== */}
        <div className="camera-learning-surface">
          {/* ------------------------------------------------------------------
              LEFT COLUMN: Camera Player, Details & Takeaways
              ------------------------------------------------------------------ */}
          <div className="camera-lesson-content">
            {/* Lesson Player (Camera Feed Container) */}
            <div className="camera-lesson-player" ref={playerRef}>
              <div className="camera-lesson-visual">
                <div className="camera-lesson-overline">
                  LIVE CCTV HIGH-RESOLUTION STREAM · 1600 × 1200 UXGA
                </div>

                <h2 className="camera-visual-headline">
                  มุมมองภาพสดจากกล้อง {currentCamera?.slotCode}
                </h2>

                {/* Viewport Frame with SVG ROI vector polygon overlays */}
                <div className="camera-viewport-frame">
                  {currentCamera?.imageUrl ? (
                    <>
                      <img
                        src={currentCamera.imageUrl}
                        alt={currentCamera.name}
                        className="camera-viewport-img"
                      />

                      {/* Offline HUD Alert */}
                      {currentCamera.isOnline === false && (
                        <div className="absolute top-4 left-4 right-4 bg-rose-950/85 backdrop-blur-md text-white border border-rose-500/40 rounded-xl p-3 flex items-center gap-2.5 z-20">
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                          <span className="text-xs sm:text-sm font-medium">
                            กล้องอยู่ในโหมดออฟไลน์ · กำลังแสดงภาพบันทึกความทรงจำล่าสุด
                          </span>
                        </div>
                      )}

                      {/* SVG ROI Vector Overlay */}
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

                      {/* Live HUD Badge */}
                      <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs text-white flex items-center gap-2 font-mono">
                        <span className={`w-2 h-2 rounded-full ${currentCamera.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span>1600 × 1200 · {currentCamera.isOnline !== false ? 'Native Stream' : 'Archive'}</span>
                      </div>

                      {/* Snapshot Timestamp Badge */}
                      {currentCamera.snapshotTimestamp && (
                        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] text-emerald-300 font-mono">
                          SYNC: {formatTimestampThai(currentCamera.snapshotTimestamp)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-72 w-full flex flex-col items-center justify-center text-neutral-400 gap-3">
                      <Activity className="w-10 h-10 animate-pulse text-emerald-500" />
                      <span className="text-sm font-medium">กำลังเชื่อมต่อสัญญาณภาพจาก ESP32 Node...</span>
                    </div>
                  )}
                </div>

                {/* Blockchain-Style 3 Pipeline Segments (Direct from Figma spec!) */}
                <div className="camera-pipeline-diagram">
                  {/* Segment 1: Ingestion ESP32 */}
                  <div className="camera-pipeline-block">
                    <div className="camera-pipeline-label">
                      <Wifi className="w-3.5 h-3.5 text-[#36612D]" />
                      <span>1. ESP32 Node</span>
                    </div>
                    <div className="camera-pipeline-bar">
                      <div className="camera-pipeline-bar-fill" style={{ width: '85%' }} />
                    </div>
                    <div className="camera-pipeline-hash">
                      Temp: {chipTemp.toFixed(1)}°C · RSSI: {wifiRssi}dBm
                    </div>
                  </div>

                  {/* Segment 2: YOLO26x AI Engine */}
                  <div className="camera-pipeline-block">
                    <div className="camera-pipeline-label">
                      <Award className="w-3.5 h-3.5 text-[#30312F]" />
                      <span>2. YOLO26x Engine</span>
                    </div>
                    <div className="camera-pipeline-bar">
                      <div className="camera-pipeline-bar-fill" style={{ width: '96%' }} />
                    </div>
                    <div className="camera-pipeline-hash">
                      ตรวจพบ: {totalOccupied} คัน (Conf: 96.5%)
                    </div>
                  </div>

                  {/* Segment 3: Parking Analytics */}
                  <div className="camera-pipeline-block active">
                    <div className="camera-pipeline-label">
                      <Car className="w-3.5 h-3.5 text-[#36612D]" />
                      <span>3. สถานะช่องจอด</span>
                    </div>
                    <div className="camera-pipeline-bar">
                      <div className="camera-pipeline-bar-fill" style={{ width: `${occupancyPct}%` }} />
                    </div>
                    <div className="camera-pipeline-hash">
                      ว่าง {totalFree}/{totalCapacity} ช่อง ({100 - occupancyPct}%)
                    </div>
                  </div>
                </div>

                <div className="camera-visual-caption">
                  ระบบวิเคราะห์ภาพถ่ายอัตโนมัติ Real-Time Synchronization จากโหนดกล้องเข้าสู่ระบบคลาวด์และฐานข้อมูล
                </div>
              </div>

              {/* Player Controls Bar */}
              <div className="camera-player-controls">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="camera-ctrl-icon-btn"
                  title={isPlaying ? 'หยุดสตรีมชั่วคราว' : 'เล่นสตรีมต่อ'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <div className="camera-ctrl-timestamp">
                  LIVE · {countdown}s SYNC
                </div>

                {/* Progress track */}
                <div className="camera-ctrl-track">
                  <div
                    className="camera-ctrl-track-elapsed"
                    style={{ width: `${Math.max(10, ((5 - countdown) / 5) * 100)}%` }}
                  />
                </div>

                <button
                  type="button"
                  className="camera-ctrl-icon-btn"
                  title="สถานะเครือข่ายกล้อง"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowRoi(!showRoi)}
                  className={`camera-ctrl-text-btn ${showRoi ? 'active' : ''}`}
                  title="เปิด/ปิด การแสดงพิกัด ROI ช่องจอด"
                >
                  ผัง ROI: {showRoi ? 'ON' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="camera-ctrl-icon-btn"
                  title="ขยายภาพเต็มจอ"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lesson Heading & Primary Action */}
            <div className="camera-lesson-heading">
              <div className="camera-lesson-title-block">
                <span className="camera-lesson-number">
                  {currentCamera?.slotCode} OBSERVATION METRICS
                </span>
                <h3 className="camera-lesson-title">
                  ผังและสถานะช่องจอดรถ (Parking Slots)
                </h3>
              </div>

              {/* Primary Action Button (Navigate to ROI Setup) */}
              <button
                type="button"
                onClick={() => onNavigate?.('setup', currentCamera?.camId)}
                className="camera-primary-action-btn"
                title="เปิดหน้าเครื่องมือตั้งค่า ROI ช่องจอดสำหรับกล้องนี้"
              >
                <Sliders className="w-4 h-4 text-emerald-300" />
                <span>ปรับแต่ง ROI ช่องจอด</span>
              </button>
            </div>

            {/* Quick Filters Row */}
            <div className="camera-filters-row">
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
                ช่องว่าง ({totalFree})
              </button>
              <button
                type="button"
                className={`camera-filter-pill ${slotFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setSlotFilter('occupied')}
              >
                มีรถจอด ({totalOccupied})
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

            {/* Interactive Slot Registry Grid */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredSlots.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-[#85847E] bg-[#FFFDF7] border border-[#DEDED2] rounded-2xl">
                  ไม่มีรายการช่องจอดตรงตามตัวกรองที่เลือก
                </div>
              ) : (
                filteredSlots.map((slot) => {
                  const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                  return (
                    <div
                      key={slot.id}
                      className="box-border p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2"
                      style={{
                        background: slot.occupied ? '#FFF9F9' : '#F7FDF4',
                        borderColor: slot.occupied ? '#F2C2C2' : '#C7E5B4'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#30312F] flex items-center gap-1.5">
                          {isBike ? (
                            <Bike className="w-3.5 h-3.5 text-[#36612D]" />
                          ) : (
                            <Car className="w-3.5 h-3.5 text-[#30312F]" />
                          )}
                          <span>{slot.id}</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            slot.occupied
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {slot.occupied ? 'มีรถ' : 'ว่าง'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#686962] truncate">
                        {slot.occupied ? (slot.vehicle_name || 'มียานพาหนะจอด') : 'พร้อมเข้าจอด'}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Lesson Description */}
            <div className="camera-desc-text">
              กล้องบันทึกภาพขนาด 1600 × 1200 และส่งสตรีมภาพความเร็วสูงผ่านโปรโตคอล HTTP Snapshot ไปยัง Ingestion Gateway
              ก่อนจะส่งพิกัดตรวจจับให้โมเดล YOLO26x และบันทึกข้อมูล Time-Series เพื่อคำนวณอัตราความหนาแน่นและแจ้งเตือนผ่าน LINE Chatbot อัตโนมัติ
            </div>

            {/* Key Takeaways Card (Figma Key Takeaways) */}
            <div className="camera-takeaways-card">
              <h4 className="camera-takeaways-title">
                ข้อมูลสรุปและจุดสังเกตสำคัญ (Key Takeaways)
              </h4>

              <div className="camera-takeaway-item">
                <CheckCircle2 className="camera-takeaway-icon" />
                <div className="camera-takeaway-desc">
                  <strong>สถานะความจุช่องจอด:</strong> ช่องรถยนต์ว่าง {carFree}/{carTotal} ช่อง และมอเตอร์ไซค์ว่าง {bikeFree}/{bikeTotal} ช่อง (ความหนาแน่นรวม {occupancyPct}%)
                </div>
              </div>

              <div className="camera-takeaway-item">
                <CheckCircle2 className="camera-takeaway-icon" />
                <div className="camera-takeaway-desc">
                  <strong>การประมวลผล Edge AI:</strong> ทำงานร่วมกับโมเดล YOLO26x ความแม่นยำสูง อัปเดตข้อมูลทุก 5 วินาที พร้อมส่งภาพเพื่อรีวิวใน Label Studio
                </div>
              </div>

              <div className="camera-takeaway-item">
                <CheckCircle2 className="camera-takeaway-icon" />
                <div className="camera-takeaway-desc">
                  <strong>สุขภาพฮาร์ดแวร์ ESP32:</strong> อุณหภูมิชิป {chipTemp.toFixed(1)}°C ({isHighTemp ? 'ความร้อนสูง' : 'ปกติ'}), สัญญาณ Wi-Fi {wifiRssi} dBm, หน่วยความจำ Heap {Math.round(freeHeap / 1024)} KB, Uptime {formatUptime(uptimeSec)}
                </div>
              </div>
            </div>

            {/* Previous / Next Camera Navigation Row */}
            <div className="camera-navigation-row">
              <button
                type="button"
                onClick={() => onSelectCamera?.(prevCamId)}
                className="camera-nav-step-btn"
                title={`สลับไปยัง ${prevCamera?.name || prevCamId}`}
              >
                <ArrowLeft className="w-4 h-4 text-[#30312F]" />
                <span>{prevCamera?.slotCode || prevCamId.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCamera?.(nextCamId)}
                className="camera-nav-step-btn"
                title={`สลับไปยัง ${nextCamera?.name || nextCamId}`}
              >
                <span>{nextCamera?.slotCode || nextCamId.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4 text-[#30312F]" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              RIGHT SIDEBAR: Course Curriculum, AI Reward, Resources
              ------------------------------------------------------------------ */}
          <aside className="camera-course-sidebar">
            {/* Sidebar Card 1: Curriculum / Camera Directory */}
            <div className="camera-curriculum-card">
              <h4 className="camera-curriculum-title">
                รายการกล้องในระบบ
              </h4>

              <div className="camera-curriculum-progress-label">
                <span className="camera-progress-completion">ความพร้อมใช้งาน</span>
                <span className="camera-progress-percent">3 / 3 ออนไลน์ (100%)</span>
              </div>

              <div className="camera-progress-track">
                <div className="camera-progress-value" style={{ width: '100%' }} />
              </div>

              {/* Cameras List */}
              <div className="camera-lessons-list">
                {cameras.map((cam) => {
                  const isActive = cam.camId === currentCamera?.camId
                  const cTotal = (cam.car?.total || 0) + (cam.bike?.total || 0)
                  const cFree = (cam.car?.free || 0) + (cam.bike?.free || 0)

                  return (
                    <div
                      key={cam.camId}
                      onClick={() => onSelectCamera?.(cam.camId)}
                      className={`camera-lesson-item ${isActive ? 'active' : ''}`}
                    >
                      {isActive ? (
                        <Play className="w-4 h-4 text-[#36612D] fill-[#36612D] shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[#36612D] shrink-0" />
                      )}

                      <div className="camera-lesson-details">
                        <div className="camera-lesson-item-title">
                          {cam.slotCode} · {cam.name}
                        </div>
                        <div className="camera-lesson-item-duration">
                          ว่าง {cFree} / {cTotal} ช่อง · {cam.device || 'ESP32'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar Card 2: AI Intelligence Card (Figma Reward Card) */}
            <div className="camera-reward-card">
              <div className="camera-reward-heading">
                <Award className="w-6 h-6 text-[#30312F]" />
                <h4 className="camera-reward-title">
                  YOLO26x Edge Intelligence
                </h4>
              </div>

              <p className="camera-reward-desc">
                ระบบตรวจจับยานพาหนะแบบเรียลไทม์ความแม่นยำสูง อัปเดตข้อมูลทุก 5 วินาที พร้อมส่งผลวิเคราะห์เข้าสู่ PostgreSQL 17
              </p>

              <div className="camera-reward-disclaimer">
                เชื่อมต่อระบบ Auto-labeling เข้ากับ <strong>Label Studio (:8080)</strong> เพื่อการปรับแต่งและ Fine-tuning โมเดลอย่างต่อเนื่อง
              </div>
            </div>

            {/* Sidebar Card 3: Resources Card */}
            <div className="camera-resource-card">
              <h4 className="camera-resource-title">
                แหล่งข้อมูลและเครื่องมือ (Resources)
              </h4>

              <p className="camera-resource-desc">
                เข้าถึงภาพถ่าย Snapshot ความละเอียดสูงระดับ 1600 × 1200 หรือตรวจสอบประวัติการรับภาพถ่ายผ่าน Ingestion Server
              </p>

              <div className="flex flex-col gap-2 pt-2">
                {currentCamera?.imageUrl && (
                  <a
                    href={currentCamera.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="camera-resource-action"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>เปิดภาพ Snapshot HD เต็มจอ (แท็บใหม่)</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate?.('logs')}
                  className="camera-resource-action text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ตรวจสอบประวัติ Ingestion Logs →</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
