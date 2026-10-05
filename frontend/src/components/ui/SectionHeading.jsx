import React from 'react'

/**
 * SectionHeading Component (White Corporate Design System)
 * Title left, detail / actions right
 */
export default function SectionHeading({
  title,
  subtitle,
  children,
  className = ''
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ${className}`}>
      <div>
        <h2 className="font-sans font-semibold text-[19px] sm:text-[21px] text-[var(--color-ink)] leading-snug tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-[13px] text-[var(--color-ink-secondary)] mt-0.5 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
