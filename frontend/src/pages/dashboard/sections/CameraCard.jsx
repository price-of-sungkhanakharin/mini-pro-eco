import React from 'react'
import {
  Maximize2,
  MapPin,
  Layers,
  AlertTriangle,
  Car,
  Bike
} from 'lucide-react'
import ProgressBar from '../../../components/ui/ProgressBar.jsx'
import Button from '../../../components/ui/Button.jsx'
import { formatTimestampThai } from '../../../utils/dumpData'

export default function CameraCard({
  camera,
  showRoiToggle = false,
  showRoiOverlay = false,
  onToggleRoi,
  onOpenModal,
  onNavigate
}) {
  if (!camera) return null

  const carTotal = camera.car?.total || 0
  const carFree = camera.car?.free || 0
  const bikeTotal = camera.bike?.total || 0
  const bikeFree = camera.bike?.free || 0

  return (
    <div className="dashboard-camera-card">
      {/* 2-line Header: Line 1 = CAM ID & Status Chip, Line 2 = Full Name */}
      <div className="camera-card-header">
        <div className="camera-header-row-1">
          <span className="camera-slot-code">{camera.slotCode || 'CAM'}</span>
          <span className={`camera-status-badge ${camera.isOnline ? 'online' : 'offline'}`}>
            {camera.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="camera-header-row-2">
          <span className="camera-name-text" title={camera.name}>
            {camera.name}
          </span>
        </div>
      </div>

      {/* 16:9 Camera Viewport (overflow hidden inside wrapper only) */}
      <div
        className="camera-image-viewport"
        onClick={() => onOpenModal && onOpenModal(camera)}
      >
        <img
          src={camera.imageUrl}
          alt={camera.name}
        />

        {/* Offline Alert Banner */}
        {!camera.isOnline && (
          <div className="camera-offline-banner">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">กล้องออฟไลน์ • {camera.statusInfo?.diffText || 'เกิน 15 นาที'}</span>
          </div>
        )}

        {/* Top HUD Tag */}
        <div className="camera-hud-tag">
          1600×1200{camera.ip ? ` · ${camera.ip}` : ''}
        </div>

        {/* Bottom Timestamp HUD */}
        <div className="camera-hud-bottom">
          {camera.isOnline
            ? (formatTimestampThai(camera.snapshotTimestamp) || 'เรียลไทม์')
            : `ล่าสุด: ${camera.snapshotTimestamp || 'ออฟไลน์'}`}
        </div>

        {/* Zoom Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenModal && onOpenModal(camera)
          }}
          className="camera-zoom-btn"
          title="ขยายดูจอใหญ่"
        >
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.7} />
        </button>
      </div>

      {/* Always 2-row Capacity Availability Block */}
      <div className="camera-availability-block">
        <div className="camera-avail-item">
          <div className="camera-avail-row">
            <div className="camera-avail-label-group">
              <Car className="w-3.5 h-3.5 shrink-0 text-[var(--color-ink-secondary)]" strokeWidth={1.7} />
              <span className="text-xs text-[var(--color-ink-secondary)]">รถยนต์:</span>
            </div>
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              {carTotal > 0 ? `${carFree}/${carTotal} ว่าง` : '—'}
            </span>
          </div>
          <ProgressBar value={carTotal > 0 ? carFree : 0} max={carTotal > 0 ? carTotal : 1} color="green" />
        </div>

        <div className="camera-avail-item">
          <div className="camera-avail-row">
            <div className="camera-avail-label-group">
              <Bike className="w-3.5 h-3.5 shrink-0 text-[var(--color-ink-secondary)]" strokeWidth={1.7} />
              <span className="text-xs text-[var(--color-ink-secondary)]">มอเตอร์ไซค์:</span>
            </div>
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              {bikeTotal > 0 ? `${bikeFree}/${bikeTotal} ว่าง` : '—'}
            </span>
          </div>
          <ProgressBar value={bikeTotal > 0 ? bikeFree : 0} max={bikeTotal > 0 ? bikeTotal : 1} color="green" />
        </div>
      </div>

      {/* Action Row pinned at bottom with height: 40px */}
      <div className="camera-actions-row">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenModal && onOpenModal(camera)}
          className="flex-1 text-xs h-[36px]"
        >
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.7} />
          <span>ขยายจอ</span>
        </Button>

        {showRoiToggle && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleRoi}
            className="flex-1 text-xs h-[36px]"
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>{showRoiOverlay ? 'ซ่อน ROI' : 'แสดง ROI'}</span>
          </Button>
        )}

        {onNavigate && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('slot_map', camera.camId || camera.id)}
            className={`text-xs h-[36px] ${showRoiToggle ? 'px-2.5' : 'flex-1'}`}
            title="วาด ROI"
          >
            <MapPin className="w-3.5 h-3.5 text-[var(--color-green-text)]" strokeWidth={1.7} />
            <span>วาด ROI</span>
          </Button>
        )}
      </div>
    </div>
  )
}
