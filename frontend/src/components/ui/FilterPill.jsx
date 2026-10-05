import React from 'react'

/**
 * FilterPill Component (White Corporate Design System)
 * Clean pill filter tab
 */
export default function FilterPill({
  children,
  active = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium transition-all duration-150 select-none cursor-pointer border ${
        active
          ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent-text)] border-[var(--color-accent-border)]'
          : 'bg-transparent text-[var(--color-ink-secondary)] border-transparent hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
