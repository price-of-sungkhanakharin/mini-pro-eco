import React from 'react'
import Card from './Card.jsx'
import AnimatedNumber from './AnimatedNumber.jsx'

/**
 * KpiCard Component (White Corporate Design System)
 * Label (14px) + Icon right, Big Value (38px Inter 600), Detail (13px muted)
 */
export default function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  variant = 'default',
  className = ''
}) {
  const isNumeric = typeof value === 'number' && !isNaN(value)

  return (
    <Card variant={variant} className={`flex flex-col justify-between gap-3 ${className}`}>
      <div className="flex items-center justify-between text-[var(--color-ink-secondary)]">
        <span className="text-sm font-medium text-[var(--color-ink-secondary)]">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-[var(--color-ink-muted)]" strokeWidth={1.7} />}
      </div>

      <div className="my-1">
        <div className="text-[38px] font-sans font-semibold text-[var(--color-ink)] tracking-tight tabular-nums leading-none">
          {isNumeric ? <AnimatedNumber value={value} /> : value}
        </div>
      </div>

      {detail && (
        <div className="text-[13px] text-[var(--color-ink-secondary)] font-normal">
          {detail}
        </div>
      )}
    </Card>
  )
}
