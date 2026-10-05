import React from 'react'

/**
 * Button Component (White Corporate Design System)
 * - primary: bg var(--color-accent-strong), text var(--color-ink-inverse), hover var(--color-accent-hover), radius var(--radius-pill)
 * - secondary: transparent bg, border var(--color-border), text var(--color-ink), hover var(--color-surface-muted)
 * - chip: bg var(--color-surface-muted), border var(--color-border), text var(--color-ink), hover accent-tint + accent-text
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconPosition = 'right',
  type = 'button',
  disabled = false,
  onClick,
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium font-sans transition-[background-color,border-color,color,transform] duration-[var(--dur-fast)] rounded-[var(--radius-pill)] select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent-strong)] focus-visible:outline-offset-2'

  const sizeStyles = {
    sm: 'h-[36px] px-4 text-xs gap-1.5',
    md: 'h-[40px] px-4 text-sm gap-2',
    lg: 'h-[48px] px-6 text-base gap-2.5'
  }

  const variantStyles = {
    primary: 'bg-[var(--color-accent-strong)] text-[var(--color-ink-inverse)] border border-transparent hover:bg-[var(--color-accent-hover)] active:scale-[0.98]',
    secondary: 'bg-transparent text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] active:scale-[0.98]',
    chip: 'bg-[var(--color-surface-muted)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent-text)] text-xs h-8 px-3'
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" strokeWidth={1.7} />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" strokeWidth={1.7} />}
    </button>
  )
}
