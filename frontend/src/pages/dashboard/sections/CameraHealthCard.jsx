import React from 'react'
import { Cpu, HardDrive, Wifi, Activity } from 'lucide-react'

export default function CameraHealthCard({ cameras = [] }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-6 flex flex-col justify-between gap-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F4F1E8]">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#30312F]" />
          <h3 className="font-sans font-bold text-xl text-[#30312F] tracking-tight">
            สถานะกล้อง
          </h3>
        </div>
        <div className="px-2.5 py-1 bg-[#EAF6E8] rounded-full font-sans font-semibold text-xs text-[#4F6B4A]">
          HEALTH
        </div>
      </div>

      {/* Camera Rows (ONLY Online / Offline per user request) */}
      <div className="flex flex-col gap-2.5">
        {cameras.map((cam, idx) => {
          if (!cam) return null
          const isOnline = Boolean(cam.isOnline)
          const shortCode = cam.slotCode ? cam.slotCode.replace('AM-', '') : `C0${idx + 1}`
          const name = cam.name ? cam.name.split('(')[0].trim() : `Camera ${idx + 1}`

          return (
            <div
              key={cam.id || idx}
              className="bg-[#F4F1E8] rounded-[14px] p-3 flex items-center justify-between gap-3 transition-colors hover:bg-[#EAE6DC]"
            >
              {/* Left: Dot & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-[#4F6B4A]' : 'bg-[#A33A3A]'
                  }`}
                />
                <span className="font-sans text-[13px] font-medium text-[#30312F] truncate">
                  <strong className="font-mono font-bold mr-1">{shortCode}</strong>· {name}
                </span>
              </div>

              {/* Right: ONLY Online / Offline Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-sans font-semibold text-xs leading-none ${
                    isOnline
                      ? 'bg-[#EAF6E8] text-[#4F6B4A]'
                      : 'bg-[#FDECEC] text-[#A33A3A]'
                  }`}
                >
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Telemetry Summary Footer */}
      <div className="pt-2 border-t border-[#F4F1E8] grid grid-cols-3 gap-2 text-center text-xs text-[#85847E]">
        <div className="p-2 bg-[#F4F1E8]/60 rounded-[10px]">
          <span className="block text-[10px] uppercase text-[#85847E]">Avg Ping</span>
          <span className="font-mono font-bold text-[#30312F]">~28ms</span>
        </div>
        <div className="p-2 bg-[#F4F1E8]/60 rounded-[10px]">
          <span className="block text-[10px] uppercase text-[#85847E]">ESP32 Heap</span>
          <span className="font-mono font-bold text-[#30312F]">156 KB</span>
        </div>
        <div className="p-2 bg-[#F4F1E8]/60 rounded-[10px]">
          <span className="block text-[10px] uppercase text-[#85847E]">Rate</span>
          <span className="font-mono font-bold text-[#4F6B4A]">0.2 fps</span>
        </div>
      </div>
    </div>
  )
}
