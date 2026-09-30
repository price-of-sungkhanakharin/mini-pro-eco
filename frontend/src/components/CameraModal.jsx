import React, { useState, useMemo } from 'react'
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
import { formatTimestampThai, formatUptime, formatHeapKb } from '../utils/dumpData'

export default function CameraModal({ camera, onClose, onNavigate }) {
  const [showRoi, setShowRoi] = useState(true)
  const [slotFilter, setSlotFilter] = useState('all') // 'all' | 'car' | 'bike' | 'vacant' | 'occupied'

  if (!camera) return null

  const isRealCam = camera.isReal || camera.id === 1 || camera.id === 2 || camera.id === 3
  const telemetry = camera.realTelemetry || {}
  const slots = camera.slots || []

  // Telemetry computations
  const chipTemp = parseFloat(telemetry.chip_temp_c || 80.0)
  const isHighTemp = chipTemp > 82.0
  const isNormalTemp = chipTemp < 78.0

  const wifiRssi = parseInt(telemetry.wifi_rssi_dbm || -82, 10)
  const getWifiQuality = (rssi) => {
    if (rssi >= -60) return { label: 'Strong (-60dBm)', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
    if (rssi >= -75) return { label: 'Good (-75dBm)', color: 'text-emerald-300', badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' }
    if (rssi >= -85) return { label: 'Fair (-85dBm)', color: 'text-amber-300', badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30' }
    return { label: 'Weak (<-85dBm)', color: 'text-rose-400', badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30' }
  }
  const wifiQuality = getWifiQuality(wifiRssi)

  const freeHeap = parseInt(telemetry.free_heap || 156704, 10)
  const freePsram = parseInt(telemetry.free_psram || 3419476, 10)
  const uptimeSec = parseInt(telemetry.uptime_sec || 2139, 10)
  const aecVal = telemetry.light_aec_value || telemetry.aec_value || 490

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

  const carTotal = camera.car?.total ?? slots.filter(s => s.type !== 'motorcycle' && s.type !== 'bike').length
  const carFree = camera.car?.free ?? slots.filter(s => s.type !== 'motorcycle' && s.type !== 'bike' && !s.occupied).length
  const bikeTotal = camera.bike?.total ?? slots.filter(s => s.type === 'motorcycle' || s.type === 'bike').length
  const bikeFree = camera.bike?.free ?? slots.filter(s => (s.type === 'motorcycle' || s.type === 'bike') && !s.occupied).length

  return (
    <div className="camera-modal-backdrop" onClick={onClose}>
      <div
        className="camera-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="modal-header-bar">
          <div className="flex items-center gap-3">
            <div className="modal-cam-badge font-bold tracking-wider">
              {camera.slotCode || 'CAM-01'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="modal-title">{camera.name}</h3>
                {isRealCam && (
                  <span className="badge-chip badge-chip-live text-[10px] tracking-wide">
                    REAL EDGE DATA
                  </span>
                )}
              </div>
              <span className="modal-subtitle">
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
                <Layers className="w-3.5 h-3.5" />
                <span>{showRoi ? 'ซ่อนผัง ROI' : 'แสดงผัง ROI'}</span>
              </button>
            )}

            <span className="modal-live-tag">
              <span className="live-ping"></span>
              <span className="live-dot"></span>
              <span>{isRealCam ? 'ONLINE • 5s SYNC' : 'LIVE FEED'}</span>
            </span>

            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Grid */}
        <div className="modal-body-grid">
          {/* Main Visual Viewport */}
          <div className="modal-viewport-container">
            <div className="modal-canvas-wrapper">
              {camera.imageUrl ? (
                <div className="modal-img-frame relative">
                  <img
                    src={camera.imageUrl}
                    alt={camera.name}
                    className="modal-feed-img"
                  />

                  {/* SVG ROI Vector Overlay */}
                  {showRoi && slots.length > 0 && (
                    <svg
                      className="modal-svg-roi-overlay"
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
                              className={`slot-polygon ${
                                isBike ? 'bike-polygon' : 'car-polygon'
                              } ${isOccupied ? 'occupied' : 'vacant'}`}
                            />
                            <rect
                              x={center.x - 38}
                              y={center.y - 14}
                              width={76}
                              height={28}
                              rx={6}
                              className={`slot-label-bg ${
                                isBike ? 'bike-label' : 'car-label'
                              } ${isOccupied ? 'occupied' : 'vacant'}`}
                            />
                            <text
                              x={center.x}
                              y={center.y + 5}
                              textAnchor="middle"
                              className="slot-label-text"
                            >
                              {isBike ? '🏍️ ' : '🚗 '}{slot.id}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  )}

                  {/* High-Tech HUD Badges on image */}
                  <div className="modal-hud-badge-top">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>1600 × 1200 UXGA • Native Resolution</span>
                  </div>

                  {camera.snapshotTimestamp && (
                    <div className="modal-hud-badge-bottom">
                      REC: {formatTimestampThai(camera.snapshotTimestamp)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Activity className="w-8 h-8 opacity-40 animate-pulse" />
                  <p className="text-sm">กำลังเชื่อมต่อสัญญาณภาพกล้อง...</p>
                </div>
              )}
            </div>

            {/* Viewport Meta Bar */}
            <div className="modal-viewport-footer">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>FPS: <strong className="text-white">{camera.fps || '0.2'}</strong></span>
                <span>Latency: <strong className="text-white">{camera.latency || '5.0s'}</strong></span>
                <span>IP: <span className="text-cyan-400 font-medium font-mono">{camera.ip}</span></span>
                {telemetry.filename && (
                  <span className="hidden sm:inline">ไฟล์: <span className="text-emerald-400 font-medium font-mono">{telemetry.filename}</span></span>
                )}
              </div>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{telemetry.status || 'ONLINE (HEALTHY)'}</span>
              </span>
            </div>
          </div>

          {/* Right Detail Pane (Redesigned with Small Gray Labels & Huge Vivid Values) */}
          <div className="modal-detail-pane flex flex-col justify-between">
            <div className="flex flex-col gap-3.5">
              
              {/* SECTION 1: HARDWARE & EDGE TELEMETRY */}
              <div className="telem-block-group">
                <div className="telem-block-header">
                  <span className="telem-block-title">ESP32 Hardware & Telemetry</span>
                  <span className="telem-block-tag">Real Edge Node</span>
                </div>

                {/* 4 Multi-colored KPI Stat Tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Tile 1: Chip Temperature (Amber / Orange / Red) */}
                  <div className={`telem-stat-tile ${isHighTemp ? 'tile-glow-danger' : 'tile-glow-amber'}`}>
                    <div className="tile-label-row">
                      <span className="tile-label">CHIP TEMPERATURE</span>
                      <Thermometer className={`w-3.5 h-3.5 ${isHighTemp ? 'text-rose-400' : 'text-amber-400'}`} />
                    </div>
                    <div className="tile-value-row">
                      <span className={`tile-value-giant ${isHighTemp ? 'text-rose-400' : 'text-amber-400'}`}>
                        {chipTemp.toFixed(1)}
                      </span>
                      <span className="tile-unit-symbol text-amber-300/80">°C</span>
                    </div>
                    <div className="tile-footer-status">
                      <span className={`tile-badge ${isHighTemp ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}`}>
                        {isHighTemp ? '⚠️ ความร้อนสูง' : 'ปกติ (Safe)'}
                      </span>
                    </div>
                  </div>

                  {/* Tile 2: Wi-Fi Signal RSSI (Electric Emerald) */}
                  <div className="telem-stat-tile tile-glow-emerald">
                    <div className="tile-label-row">
                      <span className="tile-label">WI-FI SIGNAL RSSI</span>
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="tile-value-row">
                      <span className="tile-value-giant text-emerald-400">
                        {wifiRssi}
                      </span>
                      <span className="tile-unit-symbol text-emerald-300/80">dBm</span>
                    </div>
                    <div className="tile-footer-status">
                      <span className={`tile-badge border ${wifiQuality.badgeBg}`}>
                        {wifiQuality.label}
                      </span>
                    </div>
                  </div>

                  {/* Tile 3: Free Heap Memory (Electric Cyan) */}
                  <div className="telem-stat-tile tile-glow-cyan">
                    <div className="tile-label-row">
                      <span className="tile-label">FREE HEAP RAM</span>
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="tile-value-row">
                      <span className="tile-value-giant text-cyan-400">
                        {Math.round(freeHeap / 1024)}
                      </span>
                      <span className="tile-unit-symbol text-cyan-300/80">KB</span>
                    </div>
                    <div className="tile-footer-status">
                      <span className="text-[10px] text-slate-400 font-mono">
                        PSRAM: <strong className="text-cyan-300">{(freePsram / (1024 * 1024)).toFixed(1)} MB</strong>
                      </span>
                    </div>
                  </div>

                  {/* Tile 4: Device Uptime (Vivid Purple) */}
                  <div className="telem-stat-tile tile-glow-purple">
                    <div className="tile-label-row">
                      <span className="tile-label">DEVICE UPTIME</span>
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="tile-value-row">
                      <span className="tile-value-giant text-purple-400">
                        {formatUptime(uptimeSec)}
                      </span>
                    </div>
                    <div className="tile-footer-status">
                      <span className="text-[10px] text-slate-400 font-mono">
                        AEC Light: <strong className="text-purple-300">{aecVal}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARKING CAPACITY & AVAILABILITY */}
              <div className="telem-block-group">
                <div className="telem-block-header">
                  <span className="telem-block-title">Parking Capacity & Real-Time Slots</span>
                  <span className="telem-block-tag">ROI Status</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Car Capacity (Vivid Emerald) */}
                  <div className="telem-stat-tile tile-glow-emerald">
                    <div className="tile-label-row">
                      <span className="tile-label">ช่องจอดรถยนต์</span>
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="tile-value-row">
                      <span className="tile-value-giant text-emerald-400">
                        {carFree}
                      </span>
                      <span className="text-sm font-medium text-slate-400">/ {carTotal} ช่อง</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${carTotal > 0 ? (carFree / carTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Motorcycle Capacity (Vivid Cyan) */}
                  <div className="telem-stat-tile tile-glow-cyan">
                    <div className="tile-label-row">
                      <span className="tile-label">ช่องจอดจักรยานยนต์</span>
                      <Bike className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="tile-value-row">
                      <span className="tile-value-giant text-cyan-400">
                        {bikeFree}
                      </span>
                      <span className="text-sm font-medium text-slate-400">/ {bikeTotal} ช่อง</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${bikeTotal > 0 ? (bikeFree / bikeTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* AI Forecast Banner */}
                <div className="ai-forecast-card">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="tile-label" style={{ color: '#fbbf24', opacity: 0.9 }}>
                      ทำนายโอกาสว่าง (+15 นาที)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold font-mono text-amber-400">
                      ~{camera.vacancyChance15m ?? 85}%
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SLOT REGISTRY LIST */}
              <div className="telem-block-group">
                <div className="telem-block-header">
                  <span className="telem-block-title">รายการช่องจอด (Slot Registry • {slots.length})</span>
                  
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className={`mini-filter-pill ${slotFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSlotFilter('all')}
                    >
                      ทั้งหมด
                    </button>
                    <button
                      type="button"
                      className={`mini-filter-pill ${slotFilter === 'vacant' ? 'active-green' : ''}`}
                      onClick={() => setSlotFilter('vacant')}
                    >
                      ว่าง
                    </button>
                    <button
                      type="button"
                      className={`mini-filter-pill ${slotFilter === 'occupied' ? 'active-red' : ''}`}
                      onClick={() => setSlotFilter('occupied')}
                    >
                      มีรถ
                    </button>
                  </div>
                </div>

                <div className="modal-slots-scroll-list max-h-[180px]">
                  {filteredSlots.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      ไม่มีช่องจอดตรงตามตัวกรอง
                    </div>
                  ) : (
                    filteredSlots.map((slot) => {
                      const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                      return (
                        <div
                          key={slot.id}
                          className="modal-slot-card"
                        >
                          <div className="flex items-center gap-2">
                            <span className="slot-id-badge">
                              {isBike ? (
                                <Bike className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Car className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>{slot.id}</span>
                            </span>
                            <span className="text-[11px] text-slate-300 truncate max-w-[130px]">
                              {slot.vehicle_name || (slot.occupied ? 'มีรถจอดอยู่' : 'ว่างพร้อมจอด')}
                            </span>
                          </div>

                          <span
                            className={`status-pill ${
                              slot.occupied ? 'pill-occupied' : 'pill-vacant'
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
    </div>
  )
}
