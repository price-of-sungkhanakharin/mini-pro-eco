import React, { useState } from 'react'
import { TrendingUp, Sparkles } from 'lucide-react'

export default function DensityForecastCard() {
  // 11 timeline bars corresponding to the Figma auto-layout spec (from morning to midnight)
  const forecastBars = [
    { time: '06:00', baseH: 24, predH: 30, basePct: 18, predPct: 22, status: 'ว่างมาก' },
    { time: '08:00', baseH: 42, predH: 48, basePct: 32, predPct: 38, status: 'เริ่มมีรถเข้า' },
    { time: '10:00', baseH: 54, predH: 60, basePct: 45, predPct: 52, status: 'ปานกลาง' },
    { time: '12:00', baseH: 96, predH: 114, basePct: 75, predPct: 84, status: 'ช่วงพีคสุด (Peak)' },
    { time: '14:00', baseH: 108, predH: 126, basePct: 82, predPct: 88, status: 'หนาแน่นสูง' },
    { time: '16:00', baseH: 114, predH: 138, basePct: 85, predPct: 91, status: 'หนาแน่น' },
    { time: '18:00', baseH: 78, predH: 84, basePct: 62, predPct: 68, status: 'เริ่มทยอยออก' },
    { time: '20:00', baseH: 54, predH: 60, basePct: 42, predPct: 46, status: 'ปานกลาง' },
    { time: '22:00', baseH: 36, predH: 40, basePct: 26, predPct: 30, status: 'ว่าง' },
    { time: '00:00', baseH: 24, predH: 28, basePct: 15, predPct: 18, status: 'ว่างมาก' },
    { time: '02:00', baseH: 20, predH: 22, basePct: 12, predPct: 14, status: 'ว่างมาก' }
  ]

  const [hoveredIdx, setHoveredIdx] = useState(3) // Default to 12:00 peak

  const activeBar = forecastBars[hoveredIdx] || forecastBars[3]

  return (
    <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-6 flex flex-col justify-between gap-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F4F1E8]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#30312F]" />
          <h3 className="font-sans font-bold text-xl text-[#30312F] tracking-tight">
            พยากรณ์ความหนาแน่น 24 ชม.
          </h3>
        </div>
        <div className="px-2.5 py-1 bg-[#EAF6E8] rounded-full font-sans font-semibold text-xs text-[#4F6B4A]">
          TIME-SERIES
        </div>
      </div>

      {/* Plot Canvas */}
      <div className="bg-[#F4F1E8] rounded-[16px] p-5 flex flex-col justify-between gap-4 relative overflow-hidden min-h-[220px]">
        {/* Active Tooltip / Status Display */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E6E2D8]">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#30312F] bg-white px-2 py-0.5 rounded-full border border-[#CFCFC4]">
              {activeBar.time}
            </span>
            <span className="font-sans text-[#85847E]">
              สถานะ: <strong className="text-[#30312F]">{activeBar.status}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] text-[#85847E]">
              คาดการณ์ AI: <strong className="font-mono font-bold text-[#284E1A]">{activeBar.predPct}%</strong>
            </span>
          </div>
        </div>

        {/* 24-hr Bar Visualization */}
        <div className="flex items-end justify-between gap-2 h-[120px] pt-4 px-2">
          {forecastBars.map((b, idx) => {
            const isSelected = hoveredIdx === idx
            return (
              <div
                key={b.time}
                onMouseEnter={() => setHoveredIdx(idx)}
                className="flex-1 flex flex-col items-center justify-end h-full gap-1 cursor-pointer group"
              >
                {/* Dual bar overlay (Baseline in #C7E0B8, Predicted overlay in #83F04C) */}
                <div className="w-full max-w-[28px] relative flex flex-col justify-end items-center h-full">
                  {/* Predicted foreground bar */}
                  <div
                    style={{ height: `${(b.predPct / 100) * 105}px` }}
                    className={`w-full rounded-[6px] transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#83F04C] shadow-sm scale-x-110'
                        : 'bg-[#C7E0B8] group-hover:bg-[#83F04C]/80'
                    }`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Time X-axis labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-[#85847E] px-1 pt-1 border-t border-[#E6E2D8]">
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>00:00</span>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between text-xs text-[#85847E] pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-[#C7E0B8]" />
            <span>Baseline สถิติย้อนหลัง</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-[#83F04C]" />
            <span className="text-[#30312F] font-semibold">AI Time-Series Forecast</span>
          </div>
        </div>
        <span className="text-[11px] text-[#4F6B4A] font-medium hidden sm:inline">
          R² = 0.941
        </span>
      </div>
    </div>
  )
}
