import React, { useState, useEffect } from 'react'
import {
  Video,
  Car,
  Bike,
  Activity,
  LogOut,
  ShieldCheck,
  Clock,
  Radio,
  Wifi,
  Sparkles
} from 'lucide-react'

export default function Navbar({ user, onLogout, stats }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="cpe-navbar">
      {/* Brand & Identity */}
      <div className="navbar-brand">
        <div className="brand-logo-glow">
          <Video className="w-5 h-5 text-emerald-400" />
          <span className="live-ping-dot"></span>
        </div>
        <div>
          <div className="brand-heading">
            <span className="brand-text">CPE Smart Parking AI</span>
            <span className="badge-chip badge-chip-live">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>3 CAM STREAMS</span>
            </span>
          </div>
          <div className="brand-sub">
            ระบบทำนายที่จอดรถอัจฉริยะ ภาควิชาคอมพิวเตอร์ (AI Ecosystem)
          </div>
        </div>
      </div>

      {/* Live Telemetry Summary */}
      <div className="navbar-telemetry">
        <div className="telemetry-pill">
          <span className="telemetry-icon-car">
            <Car className="w-3.5 h-3.5" />
          </span>
          <div className="telemetry-content">
            <span className="telemetry-label">รถยนต์ว่าง</span>
            <span className="telemetry-val text-emerald-400 font-mono font-bold">
              {stats?.freeCar ?? 9}/{stats?.totalCar ?? 20}
            </span>
          </div>
        </div>

        <div className="telemetry-pill">
          <span className="telemetry-icon-bike">
            <Bike className="w-3.5 h-3.5" />
          </span>
          <div className="telemetry-content">
            <span className="telemetry-label">มอเตอร์ไซค์ว่าง</span>
            <span className="telemetry-val text-cyan-400 font-mono font-bold">
              {stats?.freeBike ?? 11}/{stats?.totalBike ?? 15}
            </span>
          </div>
        </div>

        <div className="telemetry-pill telemetry-highlight">
          <span className="telemetry-icon-ai">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="telemetry-content">
            <span className="telemetry-label">โอกาสว่างใน 15 นาที</span>
            <span className="telemetry-val text-amber-300 font-mono font-bold">
              ~{stats?.avgChance ?? 79}%
            </span>
          </div>
        </div>

        <div className="telemetry-pill">
          <span className="telemetry-icon-pulse">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="telemetry-content">
            <span className="telemetry-label">อัตรา Ingestion</span>
            <span className="telemetry-val font-mono text-slate-300">
              ทุก 5 วินาที
            </span>
          </div>
        </div>
      </div>

      {/* Admin Profile & Controls */}
      <div className="navbar-actions">
        <div className="time-display">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-xs text-slate-300">
            {time.toLocaleTimeString('th-TH', { hour12: false })}
          </span>
        </div>

        <div className="user-profile-badge">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight">
              {user?.email ? user.email.split('@')[0] : 'Administrator'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="btn-logout"
          title="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}
