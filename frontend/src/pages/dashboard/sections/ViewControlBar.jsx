import React from 'react'
import {
  Car,
  Bike,
  Sparkles,
  Activity,
  RefreshCw
} from 'lucide-react'
import AnimatedNumber from '../../../components/ui/AnimatedNumber.jsx'
import { PillTag, PillButton } from '../../../components/ui/FigmaCards'

export default function ViewControlBar({
  totalCarFree,
  totalCarTotal,
  totalBikeFree,
  totalBikeTotal,
  avgChance,
  onlineCount = 0,
  countdown,
  isRefreshing,
  onRefresh
}) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Breadcrumb */}
      <div className="platform-breadcrumb">
        <span>Platform</span>
        <span>/</span>
        <span className="text-[#30312F] font-medium">Smart Parking Live Monitor</span>
      </div>

      {/* 2. Platform Intro Header */}
      <div className="platform-intro">
        <div className="platform-overview">
          <div className="platform-metadata">
            <PillTag variant="neutral">CPE Smart Campus</PillTag>
            <PillTag variant="neutral">Edge AI Inference</PillTag>
            <PillTag variant="active">
              {onlineCount > 0 ? `${onlineCount}/3 Cameras Online` : 'Cameras Ingesting'}
            </PillTag>
          </div>

          <h1 className="platform-title">
            Smart Parking Live Monitor
          </h1>

          <p className="platform-description">
            ระบบตรวจจับสถานะช่องจอดรถยนต์และมอเตอร์ไซค์แบบ Real-Time ด้วยโมเดล YOLO บนอุปกรณ์ประมวลผล Edge AI ตรวจสอบความพร้อมของที่จอดแบบปิดจุดบอดรอบอาคารภาควิชาวิศวกรรมคอมพิวเตอร์
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {countdown !== undefined && (
            <div className="flex items-center gap-2 bg-[#FAF8EF] border border-[#DEDED2] rounded-full px-4 h-12 text-xs font-medium text-[#30312F]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
              <span>รีเฟรชใน {countdown}s</span>
            </div>
          )}

          {onRefresh && (
            <PillButton
              variant="primary"
              icon={RefreshCw}
              onClick={onRefresh}
              className="h-12"
            >
              {isRefreshing ? 'กำลังซิงค์...' : 'รีเฟรชข้อมูล'}
            </PillButton>
          )}
        </div>
      </div>

      {/* 3. Bento KPI Strip (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        {/* KPI 1: Car vacancies */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">CAR VACANCIES</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Car className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#30312F] tracking-tight">
              <AnimatedNumber value={totalCarFree} />/<AnimatedNumber value={totalCarTotal} />
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#85847E]">
            <span>จำนวนช่องจอดรถยนต์ที่ว่าง</span>
          </div>
        </div>

        {/* KPI 2: Bike vacancies */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">BIKE VACANCIES</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Bike className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#30312F] tracking-tight">
              <AnimatedNumber value={totalBikeFree} />/<AnimatedNumber value={totalBikeTotal} />
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#85847E]">
            <span>จำนวนช่องจอดมอเตอร์ไซค์ที่ว่าง</span>
          </div>
        </div>

        {/* KPI 3: Vacancy estimate */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">VACANCY ESTIMATE</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Sparkles className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#30312F] tracking-tight">
              ~<AnimatedNumber value={avgChance} />%
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#85847E]">
            <span>โอกาสพบที่จอดว่างโดยเฉลี่ย</span>
          </div>
        </div>

        {/* KPI 4: Cameras online */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">CAMERAS ONLINE</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Activity className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#36612D] tracking-tight">
              <AnimatedNumber value={onlineCount} />/3
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#36612D]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
            <span>ส่งภาพเรียลไทม์ปกติ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
