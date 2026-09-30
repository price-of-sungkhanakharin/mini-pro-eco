import React, { useState } from 'react'
import {
  X,
  Clock,
  CheckCircle2,
  Cpu,
  Wifi,
  Thermometer,
  Layers,
  MapPin,
  Car,
  Bike
} from 'lucide-react'
import { formatTimestampThai, formatUptime, formatHeapKb } from '../utils/dumpData'

export default function CameraModal({ camera, onClose, onNavigate }) {
  const [showRoi, setShowRoi] = useState(true)
  if (!camera) return null

  const isRealCam = camera.isReal || camera.id === 1
  const telemetry = camera.realTelemetry || {}
  const slots = camera.slots || []

  return (
    <div className="camera-modal-backdrop" onClick={onClose}>
      <div
        className="camera-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header-bar">
          <div className="flex items-center gap-3">
            <div className="modal-cam-badge font-bold">
              {camera.slotCode || 'CAM-01'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="modal-title">{camera.name}</h3>
                {isRealCam && (
                  <span className="badge-chip badge-chip-live text-[10px]">
                    REAL DUMP DATA
                  </span>
                )}
              </div>
              <span className="modal-subtitle">
                {camera.subtitle} • {camera.device} ({camera.ip})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {slots.length > 0 && (
              <button
                type="button"
                className={`btn-toggle-roi-mini ${showRoi ? 'active' : ''}`}
                onClick={() => setShowRoi(!showRoi)}
                title="เปิด/ปิด ผังพิกัดช่องจอด ROI บนภาพ"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showRoi ? 'ซ่อนพิกัด ROI' : 'แสดงพิกัด ROI'}</span>
              </button>
            )}

            <span className="modal-live-tag">
              <span className="live-ping"></span>
              <span className="live-dot"></span>
              <span>{isRealCam ? 'HEALTHY • 5s INGESTION' : 'LIVE FEED'}</span>
            </span>

            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body-grid">
          {/* Main Visual Viewport (Full 1600x1200 image displayed with zero cropping) */}
          <div className="modal-viewport-container">
            <div className="modal-canvas-wrapper">
              {camera.imageUrl ? (
                <div className="modal-img-frame relative">
                  <img
                    src={camera.imageUrl}
                    alt={camera.name}
                    className="modal-feed-img"
                  />

                  {/* SVG ROI Vector Overlay on native 1600x1200 resolution */}
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
                    <span>1600 × 1200 px • Native Resolution</span>
                  </div>

                  {camera.snapshotTimestamp && (
                    <div className="modal-hud-badge-bottom">
                      REC: {formatTimestampThai(camera.snapshotTimestamp)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <p>ไม่มีสัญญาณภาพ</p>
                </div>
              )}
            </div>

            {/* Viewport Meta Bar */}
            <div className="modal-viewport-footer">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>FPS: <strong className="text-white">{camera.fps}</strong></span>
                <span>Latency: <strong className="text-white">{camera.latency}</strong></span>
                <span>IP: <span className="text-cyan-400 font-medium">{camera.ip}</span></span>
                {telemetry.filename && (
                  <span>ไฟล์: <span className="text-emerald-400 font-medium">{telemetry.filename}</span></span>
                )}
              </div>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status: {telemetry.status || 'ONLINE (HEALTHY)'}</span>
              </span>
            </div>
          </div>

          {/* Right Detail Pane */}
          <div className="modal-detail-pane flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <h4 className="detail-pane-title">สรุปสถานะกล้อง & Telemetry</h4>

              {/* Live Hardware Telemetry Panel (Real Data) */}
              {isRealCam && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Device Hardware Telemetry</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        <span>อุณหภูมิ Chip:</span>
                      </div>
                      <span className="font-semibold text-amber-300 text-sm">
                        {telemetry.chip_temp_c ? `${telemetry.chip_temp_c.toFixed(1)}°C` : '80.5°C'}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        <span>Free Heap:</span>
                      </div>
                      <span className="font-semibold text-cyan-300 text-sm">
                        {formatHeapKb(telemetry.free_heap)}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        <span>Wi-Fi Signal:</span>
                      </div>
                      <span className="font-semibold text-emerald-300 text-sm">
                        {telemetry.wifi_rssi_dbm ? `${telemetry.wifi_rssi_dbm} dBm` : '-82 dBm'}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>Uptime:</span>
                      </div>
                      <span className="font-semibold text-purple-300 text-sm">
                        {formatUptime(telemetry.uptime_sec)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Parking Capacity Overview */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="detail-stat-row">
                  <span className="stat-label flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-400" />
                    <span>รถยนต์คงเหลือ:</span>
                  </span>
                  <span className="stat-value text-emerald-400 font-bold">
                    {camera.car?.free ?? 4} จาก {camera.car?.total ?? 7} ช่อง
                  </span>
                </div>

                <div className="detail-stat-row">
                  <span className="stat-label flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-cyan-400" />
                    <span>จักรยานยนต์คงเหลือ:</span>
                  </span>
                  <span className="stat-value text-cyan-400 font-bold">
                    {camera.bike?.free ?? 5} จาก {camera.bike?.total ?? 8} ช่อง
                  </span>
                </div>

                <div className="detail-stat-row">
                  <span className="stat-label">ทำนายโอกาสว่าง (+15 นาที):</span>
                  <span className="stat-value text-amber-300 font-bold">
                    ~{camera.vacancyChance15m ?? 85}%
                  </span>
                </div>
              </div>

              {/* Slots List */}
              <div className="detail-slots-list flex-1 min-h-[160px] flex flex-col">
                <span className="detail-sub-title">รายการช่องจอด (Slot Registry • {slots.length}):</span>
                <div className="slots-scroll flex-1 max-h-[220px]">
                  {slots.map((slot) => {
                    const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                    return (
                      <div key={slot.id} className="slot-list-item flex items-center justify-between py-1.5 px-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-100 flex items-center gap-1">
                            {isBike ? (
                              <Bike className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <Car className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>{slot.id}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                            {slot.vehicle_name || (slot.occupied ? 'มีรถจอด' : 'ว่างพร้อมจอด')}
                          </span>
                        </div>
                        <span
                          className={`status-pill text-[10px] ${
                            slot.occupied ? 'pill-occupied' : 'pill-vacant'
                          }`}
                        >
                          {slot.occupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Quick Link to Setup View */}
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  const targetCamId =
                    camera.camId ||
                    (camera.slotCode === 'CAM-02' || camera.id === 2
                      ? 'cam2'
                      : camera.slotCode === 'CAM-03' || camera.id === 3
                      ? 'cam3'
                      : 'cam1')
                  onClose()
                  onNavigate('slot_map', targetCamId)
                }}
                className="mt-3 w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>🔧 ปรับแต่งพิกัดช่องจอด ({camera.slotCode}) ในหน้า Setup ROI</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
