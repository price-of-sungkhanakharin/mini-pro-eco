import React from 'react'
import { RefreshCw } from 'lucide-react'

export default function DashboardHeader({
  onlineCount = 3,
  countdown = 5,
  isRefreshing = false,
  onRefresh
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
      {/* Title block */}
      <div className="flex flex-col items-start gap-2 max-w-3xl">
        {/* Demo badge */}
        <div className="inline-flex items-center px-3 py-1.5 bg-[#EAF6E8] border border-[#C7E0B8] rounded-full">
          <span className="font-sans font-semibold text-xs leading-none text-[#4F6B4A] tracking-wider uppercase">
            DEMO · SYSTEM OVERVIEW
          </span>
        </div>

        {/* Title */}
        <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-[32px] lg:leading-[38px] text-[#30312F] tracking-tight">
          ภาพรวมระบบตรวจจับรถและความหนาแน่น
        </h1>

        {/* Subtitle */}
        <p className="font-sans font-normal text-sm sm:text-[15px] sm:leading-[22px] text-[#85847E]">
          ติดตามการทำงานของกล้องวงจรปิด, YOLO detection, time-series density forecast และระบบควบคุมการถ่ายภาพอัตโนมัติ
        </p>
      </div>

      {/* Header actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Live status badge */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#EAF6E8] rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#4F6B4A] animate-pulse" />
          <span className="font-sans font-semibold text-xs sm:text-[13px] text-[#4F6B4A]">
            Live · {onlineCount} กล้องเชื่อมต่อ
          </span>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs sm:text-[13px] text-[#30312F] hover:bg-[#FAF8EF] hover:border-[#85847E] transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#4F6B4A]' : 'text-[#30312F]'}`} />
          <span>Refresh {countdown !== undefined ? `(${countdown}s)` : ''}</span>
        </button>
      </div>
    </div>
  )
}
