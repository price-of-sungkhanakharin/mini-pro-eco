import React from 'react'

/**
 * BlankLayout (Editorial Light Auth Shell)
 * Provides a clean, calm travertine canvas matching Figma design tokens.
 */
export default function BlankLayout({ children }) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-12 px-4 bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="text-center mb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="brand-chain-mark" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            CPE Smart Parking AI
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-green-tint)] text-[var(--color-green-text)] border border-[var(--color-green-border)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-green-text)] animate-pulse"></span>
            LIVE
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-2)] max-w-md">
          ระบบทำนายที่จอดรถอัจฉริยะ ภาควิชาวิศวกรรมคอมพิวเตอร์ (AI Ecosystem)
        </p>
      </header>

      {children}
    </div>
  )
}
