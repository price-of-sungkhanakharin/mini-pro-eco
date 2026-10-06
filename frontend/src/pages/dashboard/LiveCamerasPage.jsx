import React from 'react'
import {
  Minimize2,
  Maximize2,
  Car,
  Bike,
  AlertTriangle
} from 'lucide-react'
import { useDashboardData } from './useDashboardData'

export default function LiveCamerasPage({ onOpenModal, onNavigate }) {
  const {
    cam1,
    cam2,
    cam3
  } = useDashboardData()

  const cameras = [cam1, cam2, cam3].filter(Boolean)
  const onlineCount = cameras.filter((c) => c?.isOnline).length

  return (
    <div className="bg-[#000000] min-h-screen text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none w-full box-border">
      {/* 1. Sleek Floating Top Bar (Clean & Minimalist) */}
      <header className="flex items-center justify-between gap-4 w-full max-w-[1700px] mx-auto pb-4 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 border border-neutral-800 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-neutral-200 tracking-wider">
              3-NODE CCTV STREAM
            </span>
            <span className="text-neutral-600 text-xs">·</span>
            <span className="font-sans text-xs font-medium text-emerald-400">
              {onlineCount}/3 กล้องออนไลน์
            </span>
          </div>

          <span className="hidden md:inline font-sans text-xs text-neutral-400">
            คลิกที่ภาพกล้องเพื่อเปิดดูข้อมูลละเอียดและการตรวจจับแบบเรียลไทม์
          </span>
        </div>

        {/* ย่อมุมมอง / กลับสู่แดชบอร์ด Button */}
        <button
          type="button"
          onClick={() => onNavigate?.('dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/80 rounded-full font-sans font-semibold text-xs sm:text-[13px] transition-all cursor-pointer shadow-lg"
          title="ย่อมุมมองและกลับสู่หน้า Dashboard หลัก"
        >
          <Minimize2 className="w-4 h-4 text-neutral-300" />
          <span>ย่อมุมมอง / กลับสู่แดชบอร์ด</span>
        </button>
      </header>

      {/* 2. Main 3-Camera Grid (Focused Purely on the 3 Cameras) */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto py-6 w-full max-w-[1700px] mx-auto flex-1 items-center">
        {cameras.map((cam) => {
          const isOnline = Boolean(cam.isOnline)
          const carTotal = cam.car?.total || 0
          const carFree = cam.car?.free || 0
          const bikeTotal = cam.bike?.total || 0
          const bikeFree = cam.bike?.free || 0
          const telemetry = cam.realTelemetry || {}

          return (
            <div
              key={cam.camId}
              className="bg-[#0A0B0D] border border-neutral-800/90 rounded-[22px] overflow-hidden flex flex-col justify-between gap-4 p-4 lg:p-5 transition-all duration-300 hover:border-neutral-600 hover:shadow-[0_0_35px_rgba(0,0,0,0.9)] group"
            >
              {/* Camera Header: Code, Name, and Status */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono font-bold text-sm text-white px-2.5 py-0.5 rounded-[6px] bg-neutral-800 border border-neutral-700/60">
                    {cam.slotCode}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-sans font-semibold text-sm text-white truncate">
                      {cam.name}
                    </h2>
                    <span className="font-sans text-[11px] text-neutral-400 truncate block">
                      {cam.subtitle || cam.device}
                    </span>
                  </div>
                </div>

                {/* Status Badge: ONLY ONLINE / OFFLINE */}
                <span
                  className={`px-2.5 py-0.5 rounded-full font-sans font-semibold text-[11px] uppercase tracking-wider shrink-0 ${
                    isOnline
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* High-Resolution Viewport (Click Directly on the Image!) */}
              <div
                className="relative w-full aspect-video rounded-[16px] overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center cursor-pointer group/viewport"
                onClick={() => onOpenModal && onOpenModal(cam)}
                title="คลิกที่รูปเพื่อเปิดดูข้อมูลละเอียด"
              >
                <img
                  src={cam.imageUrl}
                  alt={cam.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/viewport:scale-[1.03]"
                  onError={(e) => {
                    e.currentTarget.src = '/dump_data/images/2026-09-22_18-02-28_966.jpg'
                  }}
                />

                {/* Offline Warning Banner */}
                {!isOnline && (
                  <div className="absolute top-3 left-3 right-3 p-2 rounded-[10px] bg-rose-950/95 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2 z-20 shadow-md">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>ขาดการเชื่อมต่อภาพ</span>
                  </div>
                )}

                {/* Corner Resolution / Live Stream Tag */}
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-medium text-white flex items-center gap-1.5 z-10 border border-white/10">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#83F04C] animate-pulse' : 'bg-neutral-500'}`} />
                  <span>LIVE STREAM</span>
                </div>

                {/* Hover Overlay Hint (No buttons, just clear click instruction) */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/viewport:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 text-white font-sans backdrop-blur-[2px]">
                  <div className="w-11 h-11 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide">คลิกเพื่อดูข้อมูลละเอียด</span>
                </div>
              </div>

              {/* Bottom Clean Info Strip (Zero Buttons, Pure Essential Metrics) */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-900 text-xs">
                {/* Vehicle Free / Total Slot Counts */}
                <div className="flex items-center gap-2.5">
                  {carTotal > 0 && (
                    <div className="flex items-center gap-1.5 bg-neutral-900/80 px-2.5 py-1 rounded-full border border-neutral-800">
                      <Car className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-mono font-bold text-emerald-400">{carFree}</span>
                      <span className="font-mono text-neutral-400">/{carTotal} ว่าง</span>
                    </div>
                  )}

                  {bikeTotal > 0 && (
                    <div className="flex items-center gap-1.5 bg-neutral-900/80 px-2.5 py-1 rounded-full border border-neutral-800">
                      <Bike className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-mono font-bold text-emerald-400">{bikeFree}</span>
                      <span className="font-mono text-neutral-400">/{bikeTotal} ว่าง</span>
                    </div>
                  )}
                </div>

                {/* Node Telemetry Quick Glance */}
                <div className="font-mono text-[11px] text-neutral-400 flex items-center gap-2 shrink-0">
                  <span>{telemetry.chip_temp_c ? `${telemetry.chip_temp_c}°C` : ''}</span>
                  <span className="text-neutral-700">·</span>
                  <span className="text-neutral-300">{cam.latency || '28ms'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* 3. Minimal Bottom Footer */}
      <footer className="w-full max-w-[1700px] mx-auto pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] font-sans text-neutral-500">
        <span>CPE Smart Parking AI · Surveillance Room Mode</span>
        <span>Auto-sync active every 5s · Pure Black CCTV Focus</span>
      </footer>
    </div>
  )
}
