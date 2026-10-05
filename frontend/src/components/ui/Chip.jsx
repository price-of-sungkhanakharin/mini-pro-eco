import React from 'react'

/**
 * Chip / Tag Component (White Corporate Design System)
 * Radius var(--radius-pill), 12px font, padding 4px 10px, background var(--color-surface-muted)
 */
export default function Chip({
  children,
  className = '',
  ...props
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-ink-secondary)] border border-[var(--color-border)] ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
