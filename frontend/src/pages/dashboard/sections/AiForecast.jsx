import React from 'react'
import {
  Sparkles,
  Car,
  Bike
} from 'lucide-react'
import ProgressBar from '../../../components/ui/ProgressBar.jsx'

export default function AiForecast({
  avgChance,
  totalCarFree,
  totalCarTotal,
  totalBikeFree,
  totalBikeTotal
}) {
  return (
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-green-tint)] border border-[var(--color-green-border)] flex flex-col gap-4 min-w-0 box-sizing-border">
      {/* Eyebrow & Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-green-text)] mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-green-text)]" strokeWidth={1.7} />
          <span>Vacancy estimate (heuristic)</span>
        </div>

        {/* Big Vacancy Number (Inter 600) + Neutral Heuristic Pill */}
        <div className="flex items-baseline gap-3 my-1">
          <span className="font-sans text-[44px] font-semibold text-[var(--color-green-text)] leading-none tracking-tight">
            ~{avgChance}%
          </span>
          <span className="px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-ink-secondary)] border border-[var(--color-border)]">
            Heuristic
          </span>
        </div>

        <p className="text-xs text-[var(--color-green-text)] leading-relaxed mt-1">
          ค่าประมาณจากสัดส่วนช่องว่างปัจจุบัน บวกค่าชดเชยคงที่ ยังไม่ใช่ผลจากโมเดลพยากรณ์ SARIMAX
        </p>
      </div>

      {/* Campus Capacity Breakdown */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-[var(--radius-option)] bg-[var(--color-surface)] border border-[var(--color-green-border)] text-[var(--color-ink)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--color-ink)]">สัดส่วนช่องจอดว่างรวมทั้งวิทยาเขต</span>
          <span className="font-semibold text-[var(--color-green-text)]">
            {totalCarFree + totalBikeFree} / {totalCarTotal + totalBikeTotal} ช่อง
          </span>
        </div>

        {/* Car breakdown */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-secondary)]">
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>รถยนต์:</span>
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{totalCarFree}/{totalCarTotal} ว่าง</span>
          </div>
          <ProgressBar value={totalCarFree} max={totalCarTotal} color="green" />
        </div>

        {/* Bike breakdown */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-secondary)]">
            <span className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>มอเตอร์ไซค์:</span>
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{totalBikeFree}/{totalBikeTotal} ว่าง</span>
          </div>
          <ProgressBar value={totalBikeFree} max={totalBikeTotal} color="green" />
        </div>
      </div>
    </div>
  )
}
