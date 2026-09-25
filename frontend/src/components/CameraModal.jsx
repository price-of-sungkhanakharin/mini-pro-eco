import React from 'react'
import {
  X,
  Clock,
  CheckCircle2,
  Cpu,
  Wifi,
  Thermometer
} from 'lucide-react'
import { formatTimestampThai, formatUptime, formatHeapKb } from '../utils/dumpData'

export default function CameraModal({ camera, onClose }) {
  if (!camera) return null

  const isRealCam = camera.isReal || camera.id === 1
  const telemetry = camera.realTelemetry || {}

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
                <div className="modal-img-frame">
                  <img
                    src={camera.imageUrl}
                    alt={camera.name}
                    className="modal-feed-img"
                  />

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
          <div className="modal-detail-pane">
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
                <span className="stat-label">รถยนต์คงเหลือ:</span>
                <span className="stat-value text-emerald-400 font-bold">
                  {camera.car?.free ?? 4} จาก {camera.car?.total ?? 7} ช่อง
                </span>
              </div>

              <div className="detail-stat-row">
                <span className="stat-label">จักรยานยนต์คงเหลือ:</span>
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
            <div className="detail-slots-list flex-1 min-h-0 flex flex-col">
              <span className="detail-sub-title">รายการช่องจอด (Slot Registry):</span>
              <div className="slots-scroll flex-1">
                {(camera.slots || []).map((slot) => (
                  <div key={slot.id} className="slot-list-item">
                    <span className="font-bold text-slate-200">
                      {slot.id}
                    </span>
                    <span className="text-xs text-slate-400 uppercase">
                      {slot.type || 'car'}
                    </span>
                    <span
                      className={`status-pill ${
                        slot.occupied ? 'pill-occupied' : 'pill-vacant'
                      }`}
                    >
                      {slot.occupied ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
