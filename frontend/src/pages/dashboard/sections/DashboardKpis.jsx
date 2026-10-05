import React from 'react'

export default function DashboardKpis({
  onlineCount = 3,
  totalCameras = 3,
  occupancyPct = 68,
  occupiedCount = 32,
  totalCapacity = 47,
  hourlyDetections = 1284,
  precisionPct = 98,
  alertCount = 3,
  alertText = '2 กล้องเสี่ยงดับ'
}) {
  const offlineCount = Math.max(0, totalCameras - onlineCount)

  // Determine density badge level
  const densityBadge = occupancyPct >= 75
    ? { label: 'HIGH', bg: 'bg-[#FFF4E5]', text: 'text-[#8A6A1F]' }
    : occupancyPct >= 40
      ? { label: 'MODERATE', bg: 'bg-[#FAF8EF]', text: 'text-[#85847E]' }
      : { label: 'LOW', bg: 'bg-[#EAF6E8]', text: 'text-[#4F6B4A]' }

  const alertBadge = alertCount > 0
    ? { label: `${alertCount} ALERTS`, bg: 'bg-[#FDECEC]', text: 'text-[#A33A3A]' }
    : { label: 'NORMAL', bg: 'bg-[#EAF6E8]', text: 'text-[#4F6B4A]' }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Card 1: จำนวนกล้องเชื่อมต่อ */}
      <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-5 flex flex-col justify-between gap-4 h-[121px] transition-all hover:border-[#85847E] shadow-2xs">
        <div className="flex items-center justify-between w-full">
          <span className="font-sans font-semibold text-[13px] leading-4 text-[#85847E]">
            จำนวนกล้องเชื่อมต่อ
          </span>
          <span className="px-2.5 py-1 bg-[#EAF6E8] rounded-full font-sans font-semibold text-xs leading-[15px] text-[#4F6B4A]">
            ONLINE
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-sans font-bold text-[34px] leading-[38px] text-[#30312F]">
            {onlineCount}
          </span>
          <span className="font-sans font-normal text-[13px] leading-4 text-[#85847E]">
            {offlineCount > 0 ? `${offlineCount} กล้อง offline` : 'พร้อมใช้งานครบ'}
          </span>
        </div>
      </div>

      {/* Card 2: ความหนาแน่นเฉลี่ย */}
      <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-5 flex flex-col justify-between gap-4 h-[121px] transition-all hover:border-[#85847E] shadow-2xs">
        <div className="flex items-center justify-between w-full">
          <span className="font-sans font-semibold text-[13px] leading-4 text-[#85847E]">
            ความหนาแน่นเฉลี่ย
          </span>
          <span className={`px-2.5 py-1 ${densityBadge.bg} rounded-full font-sans font-semibold text-xs leading-[15px] ${densityBadge.text}`}>
            {densityBadge.label}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-sans font-bold text-[34px] leading-[38px] text-[#30312F]">
            {occupancyPct}%
          </span>
          <span className="font-sans font-normal text-[13px] leading-4 text-[#85847E]">
            {totalCapacity - occupiedCount} ช่องว่าง ({totalCapacity} ทั้งหมด)
          </span>
        </div>
      </div>

      {/* Card 3: ตรวจจับรถ / ชม. */}
      <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-5 flex flex-col justify-between gap-4 h-[121px] transition-all hover:border-[#85847E] shadow-2xs">
        <div className="flex items-center justify-between w-full">
          <span className="font-sans font-semibold text-[13px] leading-4 text-[#85847E]">
            ตรวจจับรถ / ชม.
          </span>
          <span className="px-2.5 py-1 bg-[#EAF6E8] rounded-full font-sans font-semibold text-xs leading-[15px] text-[#4F6B4A]">
            STABLE
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-sans font-bold text-[34px] leading-[38px] text-[#30312F]">
            {hourlyDetections.toLocaleString()}
          </span>
          <span className="font-sans font-normal text-[13px] leading-4 text-[#85847E]">
            {precisionPct}% precision
          </span>
        </div>
      </div>

      {/* Card 4: แจ้งเตือนความเสี่ยง */}
      <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-5 flex flex-col justify-between gap-4 h-[121px] transition-all hover:border-[#85847E] shadow-2xs">
        <div className="flex items-center justify-between w-full">
          <span className="font-sans font-semibold text-[13px] leading-4 text-[#85847E]">
            แจ้งเตือนความเสี่ยง
          </span>
          <span className={`px-2.5 py-1 ${alertBadge.bg} rounded-full font-sans font-semibold text-xs leading-[15px] ${alertBadge.text}`}>
            {alertBadge.label}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-sans font-bold text-[34px] leading-[38px] text-[#30312F]">
            {alertCount}
          </span>
          <span className="font-sans font-normal text-[13px] leading-4 text-[#85847E]">
            {alertText}
          </span>
        </div>
      </div>
    </div>
  )
}
