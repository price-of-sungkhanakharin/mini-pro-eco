import React from 'react'

/**
 * StatusChip Component (White Corporate Design System)
 * Status Colors:
 * - free / online: status-free-* tokens
 * - moderate: status-mod-* tokens
 * - full: status-full-* tokens
 * - offline: status-off-* tokens with border var(--color-border)
 */
export default function StatusChip({
  status = 'free',
  children,
  className = '',
  ...props
}) {
  const statusStyles = {
    free: 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border-[var(--color-status-free-border)]',
    available: 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border-[var(--color-status-free-border)]',
    high: 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border-[var(--color-status-free-border)]',
    online: 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border-[var(--color-status-free-border)]',

    moderate: 'bg-[var(--color-status-mod-bg)] text-[var(--color-status-mod-text)] border-[var(--color-status-mod-border)]',
    medium: 'bg-[var(--color-status-mod-bg)] text-[var(--color-status-mod-text)] border-[var(--color-status-mod-border)]',

    full: 'bg-[var(--color-status-full-bg)] text-[var(--color-status-full-text)] border-[var(--color-status-full-border)]',
    occupied: 'bg-[var(--color-status-full-bg)] text-[var(--color-status-full-text)] border-[var(--color-status-full-border)]',

    offline: 'bg-[var(--color-status-off-bg)] text-[var(--color-status-off-text)] border-[var(--color-border)]'
  }

  const activeStyle = statusStyles[status] || statusStyles.free

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-[10px] py-[3px] rounded-[var(--radius-pill)] text-xs font-medium border ${activeStyle} ${className}`}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-[var(--radius-full)] bg-current opacity-80" />
      <span>{children || (status.charAt(0).toUpperCase() + status.slice(1))}</span>
    </span>
  )
}
