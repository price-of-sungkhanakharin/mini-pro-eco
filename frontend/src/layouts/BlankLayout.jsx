import React from 'react'

/**
 * BlankLayout (Layout เปล่า)
 * ใช้สำหรับหน้าจอ Authentication (Login / Register) หรือหน้าเดี่ยวที่ไม่มี Navbar และ Sidebar
 */
export default function BlankLayout({ children }) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-10 px-4">
      <header className="header">
        <h1 className="brand-title">
          CPE Smart Parking AI
          <span className="glowing-badge">
            <span className="status-dot"></span>
            v2.0 Ecosystem Live
          </span>
        </h1>
        <p className="subtitle">
          ระบบทำนายที่จอดรถอัจฉริยะ ภาควิชาวิศวกรรมคอมพิวเตอร์ (3 Phone Cameras Stream)
        </p>
      </header>

      {children}
    </div>
  )
}
