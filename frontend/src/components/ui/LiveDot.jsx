import React from 'react'

/**
 * LiveDot Component (White Corporate Design System)
 * Status dot with subtle plain opacity pulse (no ping, no glow)
 */
export default function LiveDot({
  color = 'green',
  pulse = true,
  className = ''
}) {
  const colorMap = {
    green: 'bg-[var(--color-green-text)]',
    accent: 'bg-[var(--color-accent-strong)]',
    amber: 'bg-[var(--color-status-mod-text)]',
    red: 'bg-[var(--color-status-full-text)]'
  }

  const activeColor = colorMap[color] || colorMap.green
  const pulseClass = pulse ? 'live-dot-pulse' : ''

  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <span className={`inline-flex rounded-[var(--radius-full)] h-2.5 w-2.5 ${activeColor} ${pulseClass}`} />
    </span>
  )
}
