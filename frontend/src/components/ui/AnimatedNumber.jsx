import React, { useState, useEffect, useRef } from 'react'

/**
 * AnimatedNumber Component
 * Smoothly interpolates numeric values from previous to next value over 800ms with ease-out.
 * - Initial mount: displays immediately without counting from 0
 * - Unchanged values: zero re-renders / zero flicker
 * - Non-numeric values: rendered as-is
 * - prefers-reduced-motion: updates instantly without animation
 */
export default function AnimatedNumber({
  value,
  duration = 800,
  className = ''
}) {
  const isNumeric = typeof value === 'number' && !isNaN(value)
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)
  const isInitialMount = useRef(true)
  const rafRef = useRef(null)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevValueRef.current = value
      setDisplayValue(value)
      return
    }

    if (!isNumeric) {
      setDisplayValue(value)
      prevValueRef.current = value
      return
    }

    const startVal = typeof prevValueRef.current === 'number' && !isNaN(prevValueRef.current)
      ? prevValueRef.current
      : value
    const endVal = value
    prevValueRef.current = value

    if (startVal === endVal) {
      setDisplayValue(endVal)
      return
    }

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(endVal)
      return
    }

    const startTime = performance.now()

    // Cubic ease-out: 1 - (1 - t)^3
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(1, Math.max(0, elapsed / duration))
      const eased = easeOutCubic(progress)
      const current = Math.round(startVal + (endVal - startVal) * eased)

      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplayValue(endVal)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration, isNumeric])

  if (!isNumeric) {
    return <span className={className}>{value ?? '—'}</span>
  }

  return <span className={className}>{displayValue}</span>
}
