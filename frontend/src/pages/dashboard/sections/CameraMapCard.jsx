import React from 'react'
import { Maximize2, AlertTriangle, Car, Bike, Video } from 'lucide-react'

export default function CameraMapCard({
  cameras = [],
  onOpenModal,
  onNavigate
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-6 flex flex-col gap-5 shadow-2xs w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F4F1E8]">
        <div>
          <h2 className="font-sans font-bold text-xl text-[#30312F] tracking-tight">
            แผนที่กล้องและความหนาแน่น
          </h2>
          <p className="font-sans font-normal text-[13px] text-[#85847E] mt-0.5">
            แสดงสถานะกล้อง (Online / Offline), การตรวจจับ YOLO และมุมมองภาพแบบเรียลไทม์
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 bg-[#EAF6E8] rounded-full font-sans font-semibold text-xs text-[#4F6B4A]">
            LAST SYNC: LIVE
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('live_cameras')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs text-[#30312F] hover:bg-[#FAF8EF] hover:border-[#85847E] transition-all cursor-pointer shadow-2xs"
            title="เปิดหน้าต่างขยายมุมมองเพื่อดูเฉพาะกล้องวงจรปิดแบบเต็มจอ"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#30312F]" />
            <span>ขยายดู 3 กล้อง (หน้าใหม่)</span>
          </button>
        </div>
      </div>

      {/* 3-Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {cameras.map((cam) => {
          if (!cam) return null
          const isOnline = Boolean(cam.isOnline)
          const carTotal = cam.car?.total || 0
          const carFree = cam.car?.free || 0
          const bikeTotal = cam.bike?.total || 0
          const bikeFree = cam.bike?.free || 0

          return (
            <div
              key={cam.id || cam.slotCode}
              className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[18px] p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#85847E] hover:shadow-xs group"
            >
              {/* Camera Header: ID & ONLY Online / Offline status */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm text-[#30312F]">
                  {cam.slotCode || 'CAM'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-sans font-semibold text-[11px] uppercase tracking-wider ${
                    isOnline
                      ? 'bg-[#EAF6E8] text-[#4F6B4A]'
                      : 'bg-[#FDECEC] text-[#A33A3A]'
                  }`}
                >
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* Name & Subtitle */}
              <div className="min-w-0">
                <div className="font-sans font-medium text-xs text-[#30312F] truncate" title={cam.name}>
                  {cam.name}
                </div>
                <div className="font-sans text-[11px] text-[#85847E] truncate">
                  {cam.subtitle || cam.device}
                </div>
              </div>

              {/* 16:9 Viewport (Click opens pop-up) */}
              <div
                className="relative w-full aspect-video rounded-[14px] overflow-hidden border border-[#CFCFC4] bg-[#F4F1E8] flex items-center justify-center cursor-pointer group/viewport"
                onClick={() => onOpenModal && onOpenModal(cam)}
                title="คลิกเพื่อเปิดป๊อปอัปดูภาพและเซนเซอร์ความละเอียดสูง"
              >
                <img
                  src={cam.imageUrl}
                  alt={cam.name}
                  className="w-full h-full object-cover group-hover/viewport:scale-[1.02] transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.src = '/dump_data/images/2026-09-22_18-02-28_966.jpg'
                  }}
                />

                {/* Offline banner */}
                {!isOnline && (
                  <div className="absolute top-2 left-2 right-2 p-1.5 rounded-[10px] bg-[#FDECEC]/95 border border-[#E8C7C7] text-[#A33A3A] text-[11px] font-medium flex items-center gap-1.5 z-20 shadow-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">ขาดการเชื่อมต่อภาพ</span>
                  </div>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-[#30312F]/40 opacity-0 group-hover/viewport:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-sans text-xs font-semibold backdrop-blur-[2px]">
                  <Maximize2 className="w-4 h-4" />
                  <span>คลิกดูป๊อปอัป</span>
                </div>
              </div>

              {/* Footer info: Counts & Quick Action */}
              <div className="pt-2 border-t border-[#F4F1E8] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {carTotal > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF8EF] border border-[#CFCFC4] text-[11px] text-[#30312F] font-medium">
                      <Car className="w-3 h-3 text-[#85847E]" />
                      <span className="font-mono font-bold text-[#4F6B4A]">{carFree}</span>
                      <span>/{carTotal} ว่าง</span>
                    </div>
                  )}

                  {bikeTotal > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF8EF] border border-[#CFCFC4] text-[11px] text-[#30312F] font-medium">
                      <Bike className="w-3 h-3 text-[#85847E]" />
                      <span className="font-mono font-bold text-[#4F6B4A]">{bikeFree}</span>
                      <span>/{bikeTotal} ว่าง</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenModal && onOpenModal(cam)}
                  className="px-2.5 py-1 rounded-full bg-[#FAF8EF] hover:bg-[#EAF6E8] text-[#30312F] hover:text-[#4F6B4A] border border-[#CFCFC4] hover:border-[#C7E0B8] font-sans font-semibold text-[11px] transition-all cursor-pointer shrink-0"
                >
                  ป๊อปอัป
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
