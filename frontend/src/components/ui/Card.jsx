import React from 'react'

/**
 * Card Component (White Corporate Design System)
 * Surface var(--color-surface), border var(--color-border), radius var(--radius-card)
 * Optional variants: 'default', 'green-tint', 'chip', 'surface'
 */
export default function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  ...props
}) {
  const variantStyles = {
    default: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-ink)]',
    'green-tint': 'bg-[var(--color-green-tint)] border-[var(--color-green-border)] text-[var(--color-green-text)]',
    chip: 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-ink)]',
    surface: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-ink)]'
  }

  const baseStyle = 'rounded-[var(--radius-card)] border p-6 transition-all duration-150 relative'
  const clickableStyle = onClick ? 'cursor-pointer hover:border-[var(--color-ink-muted)]' : ''

  return (
    <div
      className={`${baseStyle} ${variantStyles[variant] || variantStyles.default} ${clickableStyle} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
