import React from 'react'
import { Layers } from 'lucide-react'
import StatusChip from '../../../components/ui/StatusChip.jsx'
import ProgressBar from '../../../components/ui/ProgressBar.jsx'

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
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between gap-5 min-w-0 box-sizing-border">
      {/* Heading */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-ink)]" strokeWidth={1.7} />
          <h3 className="font-semibold text-base text-[var(--color-ink)]">Zone Occupancy Breakdown</h3>
        </div>
        <span className="text-xs text-[var(--color-ink-secondary)]">3 Monitoring Zones</span>
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
            <div key={z.code} className="p-3.5 rounded-[var(--radius-option)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-ink)] border border-[var(--color-border)]">
                    {z.zone}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-ink)]">{z.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs font-semibold text-[var(--color-ink)] tabular-nums">
                    {freeSlots}/{totalSlots} ว่าง
                  </span>
                  <StatusChip status={status} />
                </div>
              </div>

              {/* Progress Bar */}
              <ProgressBar value={occupiedSlots} max={totalSlots} color={status === 'full' ? 'red' : status === 'moderate' ? 'sand' : 'green'} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
