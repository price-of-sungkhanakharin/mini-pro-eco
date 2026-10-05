import React from 'react'

/**
 * ProgressBar Component (White Corporate Design System)
 * 6px height, rounded-[var(--radius-full)], track var(--color-surface-muted), fill tokens
 */
export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'green',
  className = ''
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  const colorStyles = {
    green: 'bg-[var(--color-green-text)]',
    sand: 'bg-[var(--color-status-mod-text)]',
    red: 'bg-[var(--color-status-full-text)]',
    ink: 'bg-[var(--color-ink)]',
    accent: 'bg-[var(--color-accent-strong)]'
  }

  const activeColor = colorStyles[color] || colorStyles.green

  return (
    <div className={`w-full h-[6px] rounded-[var(--radius-full)] bg-[var(--color-surface-muted)] overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-[var(--radius-full)] transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)] ${activeColor}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
