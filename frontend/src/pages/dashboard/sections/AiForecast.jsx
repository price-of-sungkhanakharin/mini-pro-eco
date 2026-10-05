import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Car,
  Bike,
  Clock,
  TrendingUp,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import ProgressBar from '../../../components/ui/ProgressBar.jsx'

const CAMERA_ZONE_MAP = {
  zone_a: 'cam1',
  zone_b: 'cam2',
  zone_c: 'cam3',
  all: 'cam1'
}

const ZONE_LABELS = {
  cam1: 'หน้าภาค 1 (Zone A รถยนต์)',
  cam2: 'หน้าภาค 2 (Zone B รถยนต์)',
  cam3: 'ข้างภาคคอม (Zone C มอไซค์)'
}

export default function AiForecast({
  selectedZone = 'all',
  avgChance = 79,
  totalCarFree = 0,
  totalCarTotal = 11,
  totalBikeFree = 0,
  totalBikeTotal = 47
}) {
  const [horizon, setHorizon] = useState(15) // 15 or 30 mins
  const [forecastCam, setForecastCam] = useState(() => CAMERA_ZONE_MAP[selectedZone] || 'cam1')
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)

  // Sync camera selection when parent selectedZone changes
  useEffect(() => {
    if (selectedZone && CAMERA_ZONE_MAP[selectedZone]) {
      setForecastCam(CAMERA_ZONE_MAP[selectedZone])
    }
  }, [selectedZone])

  // Fetch real Time-Series ML forecast from FastAPI
  useEffect(() => {
    let isMounted = true

    const fetchForecast = async () => {
      try {
        setLoading(true)
        let res = await fetch(`/api/v1/timeseries/future-occupancy?camera_id=${forecastCam}&minutes=${horizon}`)
        if (!res.ok) {
          const fallback =
            typeof window !== 'undefined'
              ? `http://${window.location.hostname}:8000/api/v1/timeseries/future-occupancy?camera_id=${forecastCam}&minutes=${horizon}`
              : `http://localhost:8000/api/v1/timeseries/future-occupancy?camera_id=${forecastCam}&minutes=${horizon}`
          res = await fetch(fallback)
        }
        if (res.ok && isMounted) {
          const json = await res.json()
          if (json?.data) {
            setForecast(json.data)
          }
        }
      } catch (err) {
        console.debug('AiForecast fetch error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchForecast()
    const timer = setInterval(fetchForecast, 10000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [forecastCam, horizon])

  // Derived values from ML forecast or heuristic fallback
  const predictedFreePct = forecast
    ? Math.max(5, Math.min(99, Math.round(100 - (forecast.predicted_occupancy_pct || 0))))
    : avgChance

  const isHighChance = forecast
    ? forecast.availability_chance === 'HIGH_CHANCE'
    : predictedFreePct >= 60
  const isModerate = forecast
    ? forecast.availability_chance === 'MODERATE'
    : predictedFreePct >= 35 && predictedFreePct < 60

  return (
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-green-tint)] border border-[var(--color-green-border)] flex flex-col gap-4 min-w-0 box-sizing-border">
      {/* Eyebrow & Top Bar with Horizon Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-green-text)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-green-text)]" strokeWidth={1.7} />
          <span>AI Vacancy Forecast (Academic Time-Series)</span>
        </div>

        {/* Lead Horizon Pill Selector */}
        <div className="flex items-center gap-1 bg-[var(--color-surface)] p-0.5 rounded-[var(--radius-pill)] border border-[var(--color-green-border)] text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setHorizon(15)}
            className={`px-2.5 py-0.5 rounded-[var(--radius-pill)] font-medium transition-all ${
              horizon === 15
                ? 'bg-[var(--color-green-text)] text-white shadow-2xs font-semibold'
                : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
            }`}
          >
            +15 นาที
          </button>
          <button
            type="button"
            onClick={() => setHorizon(30)}
            className={`px-2.5 py-0.5 rounded-[var(--radius-pill)] font-medium transition-all ${
              horizon === 30
                ? 'bg-[var(--color-green-text)] text-white shadow-2xs font-semibold'
                : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
            }`}
          >
            +30 นาที
          </button>
        </div>
      </div>

      {/* Main Vacancy Display & ML Model Tag */}
      <div>
        <div className="flex items-baseline gap-3 my-1 flex-wrap">
          <span className="font-sans text-[44px] font-semibold text-[var(--color-green-text)] leading-none tracking-tight">
            ~{predictedFreePct}%
          </span>
          <span className="px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-green-text)] border border-[var(--color-green-border)] shadow-2xs flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full bg-[var(--color-green-bright)] ${loading ? 'animate-ping' : 'animate-pulse'}`} />
            Time-Series ML (v1.2)
          </span>
          {forecast?.availability_chance && (
            <span
              className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium border ${
                isHighChance
                  ? 'bg-[var(--color-status-free-bg)] text-[var(--color-status-free-text)] border-[var(--color-status-free-border)]'
                  : isModerate
                  ? 'bg-[var(--color-status-mod-bg)] text-[var(--color-status-mod-text)] border-[var(--color-status-mod-border)]'
                  : 'bg-[var(--color-status-full-bg)] text-[var(--color-status-full-text)] border-[var(--color-status-full-border)]'
              }`}
            >
              {forecast.availability_chance === 'HIGH_CHANCE'
                ? 'โอกาสมีที่จอดสูง'
                : forecast.availability_chance === 'MODERATE'
                ? 'โอกาสปานกลาง'
                : 'เสี่ยงที่จอดเต็ม'}
            </span>
          )}
        </div>

        {/* Dynamic Campus Context & Trend */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {forecast?.target_time && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink-secondary)] bg-[var(--color-surface)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-green-border)]">
              <Clock className="w-3 h-3 text-[var(--color-green-text)]" strokeWidth={1.8} />
              <span>เป้าหมาย {forecast.target_time} น.</span>
            </span>
          )}
          {forecast?.campus_phase_name && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink)] bg-[var(--color-surface)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-green-border)]">
              <GraduationCap className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.8} />
              <span>{forecast.campus_phase_name}</span>
            </span>
          )}
          {forecast?.is_class_transition && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-[var(--radius-pill)] border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>ช่วงเปลี่ยนคาบเรียน (:45-:15)</span>
            </span>
          )}
        </div>

        <p className="text-xs text-[var(--color-green-text)] leading-relaxed mt-2 font-medium">
          {forecast?.campus_trend_desc || 'คาดการณ์ความน่าจะเป็นของช่องว่างล่วงหน้า จากพฤติกรรมการจอดจริง'}
          {forecast?.availability_desc && ` — ${forecast.availability_desc}`}
        </p>
      </div>

      {/* Predictive Target Summary Card */}
      {forecast && (
        <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface)] border border-[var(--color-green-border)] flex items-center justify-between text-xs text-[var(--color-ink)] shadow-2xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--color-green-text)]" strokeWidth={1.8} />
            <div>
              <span className="font-semibold text-[var(--color-ink)]">
                {ZONE_LABELS[forecastCam] || forecastCam.toUpperCase()}
              </span>
              <span className="text-[var(--color-ink-muted)] ml-1.5">
                (ความจุ {forecast.capacity} คัน)
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-[var(--color-green-text)] text-sm">
              ว่าง ~{forecast.predicted_free_slots}
            </span>
            <span className="text-[var(--color-ink-muted)] text-[11px] ml-1">
              (จอดอยู่ ~{forecast.predicted_vehicles} คัน)
            </span>
          </div>
        </div>
      )}

      {/* Live Campus Capacity Breakdown */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-[var(--radius-option)] bg-[var(--color-surface)] border border-[var(--color-green-border)] text-[var(--color-ink)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--color-ink)]">สัดส่วนช่องจอดว่างรวมทั้งวิทยาเขต (ปัจจุบัน)</span>
          <span className="font-semibold text-[var(--color-green-text)]">
            {totalCarFree + totalBikeFree} / {totalCarTotal + totalBikeTotal} ช่อง
          </span>
        </div>

        {/* Car breakdown */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-secondary)]">
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>รถยนต์:</span>
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{totalCarFree}/{totalCarTotal} ว่าง</span>
          </div>
          <ProgressBar value={totalCarFree} max={totalCarTotal} color="green" />
        </div>

        {/* Bike breakdown */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-secondary)]">
            <span className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>มอเตอร์ไซค์:</span>
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{totalBikeFree}/{totalBikeTotal} ว่าง</span>
          </div>
          <ProgressBar value={totalBikeFree} max={totalBikeTotal} color="green" />
        </div>
      </div>

      {/* Subtext Footer */}
      <div className="text-[11px] text-[var(--color-ink-muted)] flex items-center justify-between gap-2 pt-0.5">
        <span>โมเดล ML: {forecast?.model_used || 'Gradient Boosting & Random Forest'}</span>
        <span>Lead: +{horizon}m Lead Horizon</span>
      </div>
    </div>
  )
}
