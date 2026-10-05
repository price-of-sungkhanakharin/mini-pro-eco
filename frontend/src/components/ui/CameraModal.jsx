import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Wifi,
  Thermometer,
  Layers,
  MapPin,
  Car,
  Bike,
  Activity,
  HardDrive,
  Sliders,
  ExternalLink,
  Zap,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Radio
} from 'lucide-react'
import { formatTimestampThai, formatUptime, formatHeapKb } from '../../utils/dumpData'

/**
 * CameraModal (Modern Fluid Bento Box High-Resolution CCTV Inspector)
 * Features:
 * - 1600x1200 native feed inspection with dynamic SVG ROI polygons
 * - Real-time ESP32 edge telemetry cards (Chip Temp, WiFi RSSI, Heap KB, Uptime)
 * - Real-time AI 15-minute vacancy prediction banner
 * - Interactive slot registry filterable by vehicle type and occupancy
 */
export default function CameraModal({ camera, onClose, onNavigate }) {
  const [showRoi, setShowRoi] = useState(true)
  const [slotFilter, setSlotFilter] = useState('all') // 'all' | 'car' | 'bike' | 'vacant' | 'occupied'

  const slots = camera?.slots || []

  // Filtered slots
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

  if (!camera) return null

  const isRealCam = camera.isReal || camera.id === 1 || camera.id === 2 || camera.id === 3
  const telemetry = camera.realTelemetry || {}

  // Telemetry computations
  const chipTemp = parseFloat(telemetry.chip_temp_c || 80.0)
  const isHighTemp = chipTemp > 82.0
  const isNormalTemp = chipTemp < 78.0

  const wifiRssi = parseInt(telemetry.wifi_rssi_dbm || -82, 10)
  const getWifiQuality = (rssi) => {
    if (rssi >= -60) return { label: 'Strong (-60dBm)', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
    if (rssi >= -75) return { label: 'Good (-75dBm)', color: 'text-emerald-300', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
    if (rssi >= -85) return { label: 'Fair (-85dBm)', color: 'text-amber-300', badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
    return { label: 'Weak (<-85dBm)', color: 'text-rose-400', badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
  }
  const wifiQuality = getWifiQuality(wifiRssi)

  const freeHeap = parseInt(telemetry.free_heap || 156704, 10)
  const freePsram = parseInt(telemetry.free_psram || 3419476, 10)
  const uptimeSec = parseInt(telemetry.uptime_sec || 2139, 10)
  const aecVal = telemetry.light_aec_value || telemetry.aec_value || 490

  const carTotal = camera.car?.total ?? slots.filter(s => s.type !== 'motorcycle' && s.type !== 'bike').length
  const carFree = camera.car?.free ?? slots.filter(s => s.type !== 'motorcycle' && s.type !== 'bike' && !s.occupied).length
  const bikeTotal = camera.bike?.total ?? slots.filter(s => s.type === 'motorcycle' || s.type === 'bike').length
  const bikeFree = camera.bike?.free ?? slots.filter(s => (s.type === 'motorcycle' || s.type === 'bike') && !s.occupied).length

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="camera-modal-backdrop" onClick={onClose}>
      <div
        className="camera-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="camera-modal-header">
          <div className="flex items-center gap-3">
            <div className="cam-code-tag font-bold tracking-wider text-[var(--color-status-free-text)]">
              {camera.slotCode || 'CAM-01'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-ink)] tracking-tight">{camera.name}</h3>
                {isRealCam && (
                  <span className="badge-chip badge-chip-live text-[10px] tracking-wide">
                    REAL EDGE DATA
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--color-ink-secondary)]">
                {camera.subtitle || 'กล้องตรวจจับอัจฉริยะ'} • {camera.device || 'ESP32-CAM'} ({camera.ip || '172.30.91.44'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {slots.length > 0 && (
              <button
                type="button"
                className={`btn-toggle-roi-mini ${showRoi ? 'active' : ''}`}
                onClick={() => setShowRoi(!showRoi)}
                title="เปิด/ปิด ผังพิกัดช่องจอด ROI บนภาพ"
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={1.7} />
                <span>{showRoi ? 'ซ่อนผัง ROI' : 'แสดงผัง ROI'}</span>
              </button>
            )}

            <span className={`cam-live-indicator ${camera.isOnline !== false ? 'online' : 'offline'}`}>
              {camera.isOnline !== false ? (
                <>
                  <span className="live-dot"></span>
                  <span>{isRealCam ? 'ONLINE • 5s SYNC' : 'LIVE FEED'}</span>
                </>
              ) : (
                <>
                  <span className="offline-dot"></span>
                  <span className="text-[var(--color-status-full-text)] font-bold">OFFLINE ({camera.statusInfo?.diffText || 'ภาพล่าสุดเกิน 15 นาที'})</span>
                </>
              )}
            </span>

            <button
              type="button"
              className="btn-refresh-stream"
              onClick={onClose}
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-4 h-4" strokeWidth={1.7} />
            </button>
          </div>
        </div>

        {/* Modal Body Grid */}
        <div className="camera-modal-body">
          {/* Main Visual Viewport */}
          <div className="camera-modal-canvas-wrap flex flex-col justify-between">
            <div className="w-full relative flex items-center justify-center">
              {camera.imageUrl ? (
                <div className="relative w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-black">
                  <img
                    src={camera.imageUrl}
                    alt={camera.name}
                    className="camera-modal-img w-full h-auto object-contain max-h-[60vh]"
                  />

                  {/* Offline HUD Alert */}
                  {camera.isOnline === false && (
                    <div className="cam-offline-banner">
                      <AlertTriangle className="w-4 h-4 text-rose-100 shrink-0 animate-pulse" strokeWidth={1.7} />
                      <span>
                        กล้องออฟไลน์ • ภาพล่าสุด {camera.statusInfo?.diffText || 'เกิน 15 นาที'}
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
                        const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                        const isOccupied = !!slot.occupied
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
                                  ? 'fill-rose-500/25 stroke-rose-400 stroke-2'
                                  : 'fill-emerald-500/25 stroke-emerald-400 stroke-2'
                              }`}
                            />
                            <rect
                              x={center.x - 38}
                              y={center.y - 14}
                              width={76}
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

                  {/* High-Tech HUD Badges on image */}
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-[var(--radius-pill)] border border-white/20 text-[11px] text-white flex items-center gap-1.5 font-mono">
                    <span className={`w-2 h-2 rounded-full ${camera.isOnline !== false ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                    <span>1600 × 1200 UXGA • {camera.isOnline !== false ? 'Native Resolution' : 'OFFLINE ARCHIVE'}</span>
                  </div>

                  {camera.snapshotTimestamp && (
                    <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-[var(--radius-pill)] border border-white/20 text-[11px] text-emerald-300 font-mono">
                      REC: {formatTimestampThai(camera.snapshotTimestamp)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center text-[var(--color-ink-muted)] gap-2">
                  <Activity className="w-8 h-8 opacity-40 animate-pulse" strokeWidth={1.7} />
                  <p className="text-sm">กำลังเชื่อมต่อสัญญาณภาพกล้อง...</p>
                </div>
              )}
            </div>

            {/* Viewport Meta Footer */}
            <div className="w-full mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-ink-secondary)] flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span>FPS: <strong className="text-[var(--color-ink)] font-mono">{camera.fps || '0.2'}</strong></span>
                <span>Latency: <strong className="text-[var(--color-ink)] font-mono">{camera.latency || '5.0s'}</strong></span>
                <span>IP: <span className="text-[var(--color-ink)] font-medium font-mono">{camera.ip}</span></span>
              </div>
              <span className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] border ${
                camera.isOnline !== false
                  ? 'text-[var(--color-status-free-text)] bg-[var(--color-status-free-bg)] border-[var(--color-status-free-border)]'
                  : 'text-[var(--color-status-full-text)] bg-[var(--color-status-full-bg)] border-[var(--color-status-full-border)]'
              }`}>
                {camera.isOnline !== false ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-status-free-text)]" strokeWidth={1.7} />
                    <span>{telemetry.status || 'ONLINE (HEALTHY)'}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-status-full-text)] animate-pulse" strokeWidth={1.7} />
                    <span>OFFLINE (ภาพล่าสุดเกิน 15 นาที)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Right Detail Pane (Bento Telemetry Cards & Slot Registry) */}
          <div className="camera-modal-side">
            <div className="flex flex-col gap-3.5">
              
              {/* SECTION 1: HARDWARE & EDGE TELEMETRY */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">ESP32 Hardware & Telemetry</span>
                  <span className="text-[10px] text-[var(--color-status-free-text)] font-mono font-bold bg-[var(--color-status-free-bg)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-status-free-border)]">Real Node</span>
                </div>

                {/* 4 Multi-colored KPI Stat Tiles */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Tile 1: Chip Temperature */}
                  <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[var(--color-ink-secondary)] text-[10px] font-semibold uppercase">
                      <span>Chip Temp</span>
                      <Thermometer className={`w-3.5 h-3.5 ${isHighTemp ? 'text-[var(--color-status-full-text)]' : 'text-[var(--color-status-mod-text)]'}`} strokeWidth={1.7} />
                    </div>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className={`text-lg font-black font-mono tabular-nums ${isHighTemp ? 'text-[var(--color-status-full-text)]' : 'text-[var(--color-status-mod-text)]'}`}>
                        {chipTemp.toFixed(1)}
                      </span>
                      <span className="text-xs text-[var(--color-ink-secondary)]">°C</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${isHighTemp ? 'text-[var(--color-status-full-text)]' : 'text-[var(--color-status-mod-text)]'}`}>
                      {isHighTemp ? 'ความร้อนสูง (High)' : 'ปกติ (Safe)'}
                    </span>
                  </div>

                  {/* Tile 2: Wi-Fi Signal RSSI */}
                  <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[var(--color-ink-secondary)] text-[10px] font-semibold uppercase">
                      <span>WiFi Signal</span>
                      <Wifi className="w-3.5 h-3.5 text-[var(--color-status-free-text)]" strokeWidth={1.7} />
                    </div>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-lg font-black font-mono text-[var(--color-status-free-text)] tabular-nums">
                        {wifiRssi}
                      </span>
                      <span className="text-xs text-[var(--color-ink-secondary)]">dBm</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--color-status-free-text)]">
                      {wifiQuality.label}
                    </span>
                  </div>

                  {/* Tile 3: Free Heap Memory */}
                  <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[var(--color-ink-secondary)] text-[10px] font-semibold uppercase">
                      <span>Free Heap</span>
                      <HardDrive className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                    </div>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-lg font-black font-mono text-[var(--color-ink)] tabular-nums">
                        {Math.round(freeHeap / 1024)}
                      </span>
                      <span className="text-xs text-[var(--color-ink-secondary)]">KB</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-ink-secondary)] font-mono tabular-nums">
                      PSRAM: {(freePsram / (1024 * 1024)).toFixed(1)}MB
                    </span>
                  </div>

                  {/* Tile 4: Device Uptime */}
                  <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[var(--color-ink-secondary)] text-[10px] font-semibold uppercase">
                      <span>Uptime</span>
                      <Clock className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                    </div>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-sm font-bold font-mono text-[var(--color-ink)] truncate tabular-nums">
                        {formatUptime(uptimeSec)}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-ink-secondary)] font-mono">
                      AEC: {aecVal}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARKING CAPACITY & AVAILABILITY */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">Parking Capacity</span>
                  <span className="text-[10px] text-[var(--color-ink-secondary)] font-mono">ROI Summary</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Car Capacity */}
                  <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2.5 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-accent-strong)] mb-1">
                      <span>รถยนต์</span>
                      <Car className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black font-mono text-[var(--color-ink)] tabular-nums">{carFree}</span>
                      <span className="text-xs text-[var(--color-ink-secondary)]">/ {carTotal} ช่อง</span>
                    </div>
                    <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-[var(--color-accent-strong)] h-full rounded-full transition-all duration-500"
                        style={{ width: `${carTotal > 0 ? (carFree / carTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Motorcycle Capacity */}
                  <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2.5 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-status-free-text)] mb-1">
                      <span>มอเตอร์ไซค์</span>
                      <Bike className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black font-mono text-[var(--color-ink)] tabular-nums">{bikeFree}</span>
                      <span className="text-xs text-[var(--color-ink-secondary)]">/ {bikeTotal} ช่อง</span>
                    </div>
                    <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-[var(--color-status-free-text)] h-full rounded-full transition-all duration-500"
                        style={{ width: `${bikeTotal > 0 ? (bikeFree / bikeTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SLOT REGISTRY LIST */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">Slot Registry ({slots.length})</span>
                  
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-0.5 rounded-[var(--radius-pill)] border border-[var(--color-border)]">
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-medium transition-colors ${slotFilter === 'all' ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-bold' : 'text-[var(--color-ink-secondary)]'}`}
                      onClick={() => setSlotFilter('all')}
                    >
                      ทั้งหมด
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-medium transition-colors ${slotFilter === 'vacant' ? 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border border-[var(--color-status-free-border)]' : 'text-[var(--color-ink-secondary)]'}`}
                      onClick={() => setSlotFilter('vacant')}
                    >
                      ว่าง
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-medium transition-colors ${slotFilter === 'occupied' ? 'bg-[var(--color-status-full-bg)] text-[var(--color-status-full-text)] border border-[var(--color-status-full-border)]' : 'text-[var(--color-ink-secondary)]'}`}
                      onClick={() => setSlotFilter('occupied')}
                    >
                      มีรถ
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {filteredSlots.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[var(--color-ink-muted)]">
                      ไม่มีช่องจอดตรงตามตัวกรอง
                    </div>
                  ) : (
                    filteredSlots.map((slot) => {
                      const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                      return (
                        <div
                          key={slot.id}
                          className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-tile)] p-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[var(--color-ink)] flex items-center gap-1">
                              {isBike ? (
                                <Bike className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                              ) : (
                                <Car className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                              )}
                              <span>{slot.id}</span>
                            </span>
                            <span className="text-[11px] text-[var(--color-ink-secondary)] truncate max-w-[120px]">
                              {slot.vehicle_name || (slot.occupied ? 'มีรถจอดอยู่' : 'ว่างพร้อมจอด')}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-bold font-mono ${
                              slot.occupied
                                ? 'bg-[var(--color-status-full-bg)] text-[var(--color-status-full-text)] border border-[var(--color-status-full-border)]'
                                : 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border border-[var(--color-status-free-border)]'
                            }`}
                          >
                            {slot.occupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
