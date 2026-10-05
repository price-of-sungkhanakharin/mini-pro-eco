import React from 'react'
import { Layers } from 'lucide-react'
import StatusChip from '../../../components/ui/StatusChip.jsx'
import ProgressBar from '../../../components/ui/ProgressBar.jsx'
import { PillTag } from '../../../components/ui/FigmaCards'

export default function ZoneBreakdown({
  cam1Counts,
  cam2Counts,
  cam3Counts
}) {
  const zones = [
    { code: 'CAM-01', zone: 'Zone A', name: 'ลานหน้าภาค 1 (รถยนต์)', counts: cam1Counts },
    { code: 'CAM-02', zone: 'Zone B', name: 'ลานหน้าภาค 2 (ในร่ม)', counts: cam2Counts },
    { code: 'CAM-03', zone: 'Zone C', name: 'ลานข้างตึกภาคคอม (มอไซค์)', counts: cam3Counts }
  ]

  return (
    <div className="p-6 lg:p-7 rounded-[24px] bg-[#FFFDF7] border border-[#DEDED2] shadow-xs flex flex-col justify-between gap-5 min-w-0 box-sizing-border">
      {/* Heading */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
            <Layers className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#30312F]">Zone Occupancy Breakdown</h3>
            <p className="text-[11px] text-[#85847E]">อัตราการเข้าจอดรายโซนตามเวลาจริง</p>
          </div>
        </div>
        <PillTag variant="neutral">3 Active Zones</PillTag>
      </div>

      {/* 3 Zone Progress Rows (Real counts from camera sensors) */}
      <div className="flex flex-col gap-3.5">
        {zones.map((z) => {
          const totalSlots = (z.counts?.car?.total || 0) + (z.counts?.bike?.total || 0)
          const freeSlots = (z.counts?.car?.free || 0) + (z.counts?.bike?.free || 0)
          const occupiedSlots = totalSlots - freeSlots
          const occPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0
          const status = occPct >= 80 ? 'full' : occPct >= 40 ? 'moderate' : 'free'

          return (
            <div
              key={z.code}
              className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2.5 transition-all hover:border-[#B8B8A8]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PillTag variant="neutral">{z.zone}</PillTag>
                  <span className="text-sm font-semibold text-[#30312F]">{z.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#30312F] tabular-nums">
                    {freeSlots}/{totalSlots} ว่าง
                  </span>
                  <StatusChip status={status} />
                </div>
              </div>

              {/* Progress Bar */}
              <ProgressBar
                value={occupiedSlots}
                max={totalSlots}
                color={status === 'full' ? 'red' : status === 'moderate' ? 'sand' : 'green'}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
