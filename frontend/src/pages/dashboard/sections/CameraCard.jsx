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
import { PillTag } from '../../../components/ui/FigmaCards'
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
    <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
      {/* 2-line Header: Line 1 = CAM ID & Status Chip, Line 2 = Full Name */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-sm text-[#30312F]">{camera.slotCode || 'CAM'}</span>
          <PillTag variant={camera.isOnline ? 'active' : 'neutral'}>
            {camera.isOnline ? 'ONLINE' : 'OFFLINE'}
          </PillTag>
        </div>
        <div className="truncate">
          <span className="text-xs text-[#85847E] font-medium" title={camera.name}>
            {camera.name}
          </span>
        </div>
      </div>

      {/* 16:9 Camera Viewport */}
      <div
        className="relative w-full aspect-video rounded-[16px] overflow-hidden border border-[#DEDED2] bg-[#FAF8EF] flex items-center justify-center cursor-pointer group"
        onClick={() => onOpenModal && onOpenModal(camera)}
      >
        <img
          src={camera.imageUrl}
          alt={camera.name}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
        />

        {/* Offline Alert Banner */}
        {!camera.isOnline && (
          <div className="absolute top-2 left-2 right-2 p-2 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium flex items-center gap-2 z-20 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">กล้องออฟไลน์ • {camera.statusInfo?.diffText || 'เกิน 15 นาที'}</span>
          </div>
        )}

        {/* Top HUD Tag */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#FFFDF7]/90 backdrop-blur-xs border border-[#DEDED2] text-[10px] font-mono text-[#30312F]">
          1600×1200{camera.ip ? ` · ${camera.ip}` : ''}
        </div>

        {/* Bottom Timestamp HUD */}
        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#1E1F1D]/80 text-white text-[10px] font-mono">
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
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#FFFDF7]/90 hover:bg-[#FFFDF7] border border-[#DEDED2] flex items-center justify-center text-[#30312F] cursor-pointer transition-colors shadow-2xs"
          title="ขยายดูจอใหญ่"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2-row Capacity Availability Block */}
      <div className="flex flex-col gap-2">
        <div className="p-3 rounded-[14px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#85847E]">
              <Car className="w-3.5 h-3.5" />
              <span>รถยนต์:</span>
            </div>
            <span className="font-semibold text-[#30312F]">
              {carTotal > 0 ? `${carFree}/${carTotal} ว่าง` : '—'}
            </span>
          </div>
          <ProgressBar value={carTotal > 0 ? carFree : 0} max={carTotal > 0 ? carTotal : 1} color="green" />
        </div>

        <div className="p-3 rounded-[14px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#85847E]">
              <Bike className="w-3.5 h-3.5" />
              <span>มอเตอร์ไซค์:</span>
            </div>
            <span className="font-semibold text-[#30312F]">
              {bikeTotal > 0 ? `${bikeFree}/${bikeTotal} ว่าง` : '—'}
            </span>
          </div>
          <ProgressBar value={bikeTotal > 0 ? bikeFree : 0} max={bikeTotal > 0 ? bikeTotal : 1} color="green" />
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onOpenModal && onOpenModal(camera)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[#FAF8EF] hover:bg-[#F0EEE4] border border-[#DEDED2] text-xs font-medium text-[#30312F] cursor-pointer transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>ขยายจอ</span>
        </button>

        {showRoiToggle && (
          <button
            type="button"
            onClick={onToggleRoi}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[#FAF8EF] hover:bg-[#F0EEE4] border border-[#DEDED2] text-xs font-medium text-[#30312F] cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showRoiOverlay ? 'ซ่อน ROI' : 'แสดง ROI'}</span>
          </button>
        )}

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('setup', camera.camId || camera.id)}
            className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[#FAF8EF] hover:bg-[#F0EEE4] border border-[#DEDED2] text-xs font-medium text-[#30312F] cursor-pointer transition-colors ${showRoiToggle ? 'px-3' : 'flex-1'}`}
            title="ไปหน้าตั้งค่า ROI"
          >
            <MapPin className="w-3.5 h-3.5 text-[#36612D]" />
            <span>ตั้งค่า ROI</span>
          </button>
        )}
      </div>
    </div>
  )
}
