import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Centralized App-Wide Modal Component (ป็อปอัปกลางสำหรับทั้งระบบ)
 *
 * คุณสมบัติ:
 * - ใช้ ReactDOM.createPortal แนบเข้ากับ document.body โดยตรง
 * - เลเยอร์บนสุดแน่นอน (z-[99999]) อยู่เหนือ Navbar, Sidebar และ Drawer ทุกตัว
 * - พื้นหลังมืดสนิทคลุมทั้งหน้าจอ 100% (Full Viewport Dark Backdrop + Backdrop Blur)
 * - อยู่กึ่งกลางหน้าจอทั้งแกน X และ Y (Centered Viewport)
 * - ล็อค Scroll ของหน้าเว็บด้านหลังเมื่อเปิด (Body Scroll Lock)
 * - รองรับปุ่ม Escape และการคลิกพื้นที่ว่างด้านนอกเพื่อปิด
 * - นำไปใช้ซ้ำได้กับทุกหน้าและทุกฟีเจอร์ในระบบ
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconBg = 'bg-[#E7F4D8]',
  iconBorder = 'border-[#BBF7D0]',
  badge,
  children,
  footer,
  size = 'lg', // 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className = '',
  showCloseButton = true
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'

    // Handle Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const sizeClasses = {
    sm: 'max-w-[420px]',
    md: 'max-w-[520px]',
    lg: 'max-w-[640px]',
    xl: 'max-w-[780px]',
    '2xl': 'max-w-[960px]'
  }[size] || 'max-w-[640px]'

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{
        backgroundColor: 'rgba(15, 17, 16, 0.76)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`relative w-full ${sizeClasses} my-auto bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-2xl p-6 sm:p-8 flex flex-col gap-5 transition-all duration-200 animate-fadeIn ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Header */}
        {(title || Icon || showCloseButton) && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {Icon && (
                <div
                  className={`w-12 h-12 rounded-[16px] ${iconBg} border ${iconBorder} flex items-center justify-center flex-shrink-0`}
                >
                  {typeof Icon === 'function' ? <Icon size={24} /> : Icon}
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h3 className="font-sans font-bold text-[19px] leading-[23px] text-[#30312F] m-0">
                      {title}
                    </h3>
                  )}
                  {badge}
                </div>
                {subtitle && (
                  <p className="font-sans text-xs text-[#686962] m-0 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F0EEE4] hover:bg-[#E2DFD2] flex items-center justify-center text-[#686962] hover:text-[#30312F] transition-colors border-0 cursor-pointer flex-shrink-0"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="flex flex-col gap-4 text-[#30312F]">
          {children}
        </div>

        {/* Footer Actions */}
        {footer && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#DEDED2] flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
