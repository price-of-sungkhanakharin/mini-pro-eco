import React from 'react'

/**
 * MetaRow Component (White Corporate Design System)
 * Zero-pill unboxed metadata row: items separated by inline dots ( · )
 */
export default function MetaRow({
  items = [],
  children,
  className = ''
}) {
  if (children) {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-ink-secondary)] font-normal ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--color-ink-secondary)] font-normal ${className}`}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <span className="inline-flex items-center gap-1">{item}</span>
          {idx < items.length - 1 && (
            <span aria-hidden="true" className="text-[var(--color-border)] font-bold">·</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
