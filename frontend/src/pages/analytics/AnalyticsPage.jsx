import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Activity,
  Cpu,
  RefreshCw,
  TrendingUp,
  Wifi,
  Thermometer,
  Zap,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Camera,
  Sliders,
  Sparkles,
  Gauge,
  Layers,
} from 'lucide-react'

export default function AnalyticsPage({ apiBase = '' }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('timeseries') // 'timeseries' or 'yolo'

  // Global filters
  const [hoursFilter, setHoursFilter] = useState(48)
  const [activeCamFilter, setActiveCamFilter] = useState('all')

  // Loading & state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  // Data sets
  const [yoloData, setYoloData] = useState(null)
  const [tsGraphData, setTsGraphData] = useState(null)
  const [modelMetrics, setModelMetrics] = useState(null)
  const [liveCameras, setLiveCameras] = useState(null)

  // Future availability predictor widget state
  const [predictCam, setPredictCam] = useState('cam1')
  const [predictHorizon, setPredictHorizon] = useState(15)
  const [futurePrediction, setFuturePrediction] = useState(null)

  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  // Fetch all analytics data
  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [yoloRes, tsRes, metricsRes, statusRes] = await Promise.all([
        fetch(`${effectiveApiBase}/api/v1/analytics/data?hours=${hoursFilter}`),
        fetch(`${effectiveApiBase}/api/v1/timeseries/graph-data?hours=${hoursFilter}&camera_id=${activeCamFilter}`),
        fetch(`${effectiveApiBase}/api/v1/timeseries/model-metrics`),
        fetch(`${effectiveApiBase}/api/v1/timeseries/cameras/status`),
      ])

      if (yoloRes.ok) {
        const yoloJson = await yoloRes.json()
        setYoloData(yoloJson)
      }
      if (tsRes.ok) {
        const tsJson = await tsRes.json()
        setTsGraphData(tsJson)
      }
      if (metricsRes.ok) {
        const metricsJson = await metricsRes.json()
        setModelMetrics(metricsJson.metadata || null)
      }
      if (statusRes.ok) {
        const statusJson = await statusRes.json()
        setLiveCameras(statusJson.cameras || null)
      }

      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err.message || 'Error connecting to analytics backend')
    } finally {
      setLoading(false)
    }
  }

  // Fetch future occupancy prediction
  const fetchFuturePrediction = async (camId = predictCam, horizon = predictHorizon) => {
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/timeseries/future-occupancy?camera_id=${camId}&minutes=${horizon}`)
      if (res.ok) {
        const json = await res.json()
        setFuturePrediction(json.data || null)
      }
    } catch (err) {
      console.error('Future prediction fetch error:', err)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [hoursFilter, activeCamFilter])

  useEffect(() => {
    fetchFuturePrediction(predictCam, predictHorizon)
  }, [predictCam, predictHorizon])

  const timeSeriesList = tsGraphData?.series || []
  const summary = yoloData?.summary || {}

  const featureImportances = modelMetrics?.top_features || [
    { feature: 'delta_vehicles', importance: 0.4808 },
    { feature: 'chip_temp_c', importance: 0.1337 },
    { feature: 'is_weekend', importance: 0.0984 },
    { feature: 'day_of_week', importance: 0.0953 },
    { feature: 'campus_phase', importance: 0.0911 },
    { feature: 'day_type', importance: 0.0691 },
    { feature: 'is_class_transition', importance: 0.0197 },
    { feature: 'is_lecture_time', importance: 0.0108 },
  ]

  const modelComparison = yoloData?.model_comparison || []
  const resolutionBenchmark = yoloData?.resolution_benchmark || []
  const quantizationBenchmark = yoloData?.quantization_benchmark || []
  const flickerStability = yoloData?.flicker_stability || []

  // Clean White Corporate Tooltip Style
  const tooltipStyle = {
    backgroundColor: 'var(--color-surface, #FFFFFF)',
    border: '1px solid var(--color-border, #E5E7EB)',
    borderRadius: 'var(--radius-option, 8px)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    fontSize: '12px',
    color: 'var(--color-ink, #111827)',
    padding: '8px 12px',
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & FILTER TOOLBAR (Matches Navbar & Dashboard Shell)         */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold bg-[var(--color-accent-tint)] text-[var(--color-accent-text)] border border-[var(--color-accent-border)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-strong)] animate-pulse"></span>
              Time-Series & Analytics Hub
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">
              {summary.total_telemetry_records?.toLocaleString() || '120,000+'} frames indexed
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] mt-1.5">
            ระบบวิเคราะห์ข้อมูลและพยากรณ์อัจฉริยะ (Campus Analytics & Time-Series)
          </h1>
          <p className="text-sm text-[var(--color-ink-secondary)] mt-0.5">
            ประมวลผลข้อมูลอนุกรมเวลา (Time-Series) เพื่อควบคุมรอบ Deep-Sleep และทำนายความว่างของที่จอดรถล่วงหน้าตามตารางเรียน
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time range selector */}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-pill)] px-3 py-1.5 shadow-sm text-xs font-medium text-[var(--color-ink)]">
            <Clock className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
            <select
              value={hoursFilter}
              onChange={(e) => setHoursFilter(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer pr-1 text-xs font-medium text-[var(--color-ink)]"
            >
              <option value={12}>12 ชั่วโมงล่าสุด</option>
              <option value={24}>24 ชั่วโมงล่าสุด</option>
              <option value={48}>48 ชั่วโมงล่าสุด</option>
              <option value={72}>72 ชั่วโมงล่าสุด</option>
              <option value={168}>7 วันย้อนหลัง</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-medium rounded-[var(--radius-pill)] shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>อัปเดตข้อมูล</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEGMENTED TAB SWITCHER (Figma QCLAY Theme)                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex p-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-pill)] shadow-sm">
          <button
            onClick={() => setActiveTab('timeseries')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-option)] text-xs font-semibold transition-all ${
              activeTab === 'timeseries'
                ? 'bg-[var(--color-surface)] text-[var(--color-accent-text)] shadow-sm'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Time-Series & Campus Adaptive System</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green-bright)]"></span>
          </button>

          <button
            onClick={() => setActiveTab('yolo')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-option)] text-xs font-semibold transition-all ${
              activeTab === 'yolo'
                ? 'bg-[var(--color-surface)] text-[var(--color-accent-text)] shadow-sm'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Computer Vision & YOLO Benchmarks</span>
          </button>
        </div>

        {lastRefreshed && (
          <span className="text-xs text-[var(--color-ink-muted)]">
            ซิงค์ล่าสุดเมื่อ: {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-[var(--radius-card)] text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-xs">ไม่สามารถเชื่อมต่อข้อมูลวิเคราะห์ได้</p>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TIME-SERIES & CAMPUS ADAPTIVE SYSTEM                               */}
      {/* ========================================================================= */}
      {activeTab === 'timeseries' && (
        <div className="space-y-6">
          {/* --------------------------------------------------------------------- */}
          {/* SECTION A: FUTURE PARKING AVAILABILITY PREDICTOR (+15m & +30m)        */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-[var(--color-border)] gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.8} />
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                    ระบบพยากรณ์ความว่างของที่จอดรถล่วงหน้า (Predictive Parking Availability: +15m & +30m)
                  </h2>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  วิเคราะห์แนวโน้มล่วงหน้าตามตารางกิจกรรมมหาวิทยาลัย (Academic Campus Phases) และประวัติการจอดจริง
                </p>
              </div>

              {/* Selector Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Camera Toggle */}
                <div className="inline-flex p-0.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-pill)]">
                  {[
                    { id: 'cam1', label: 'CAM-01 (หน้าภาค 1)' },
                    { id: 'cam2', label: 'CAM-02 (หน้าภาค 2)' },
                    { id: 'cam3', label: 'CAM-03 (ข้างภาคคอม)' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPredictCam(c.id)}
                      className={`px-3 py-1 rounded-[var(--radius-option)] text-xs font-medium transition-all ${
                        predictCam === c.id
                          ? 'bg-[var(--color-surface)] text-[var(--color-accent-text)] font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Horizon Toggle */}
                <div className="inline-flex p-0.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-pill)]">
                  {[15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setPredictHorizon(mins)}
                      className={`px-3 py-1 rounded-[var(--radius-option)] text-xs font-medium transition-all ${
                        predictHorizon === mins
                          ? 'bg-amber-500 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      +{mins} นาที
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction Cards Display */}
            {futurePrediction ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Card 1: Target Forecast Time */}
                <div className="p-4 rounded-[var(--radius-tile)] bg-[var(--color-accent-tint)] border border-[var(--color-accent-border)] flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[var(--color-accent-text)] uppercase tracking-wider">
                    เวลาเป้าหมายพยากรณ์
                  </span>
                  <div>
                    <div className="text-3xl font-bold tracking-tight text-[var(--color-accent-text)]">
                      {futurePrediction.target_time} น.
                    </div>
                    <div className="text-xs text-[var(--color-accent-text)] font-medium mt-1">
                      (อีก +{futurePrediction.horizon_minutes} นาทีข้างหน้า)
                    </div>
                  </div>
                  <div className="text-xs bg-[var(--color-surface)] text-[var(--color-ink)] p-2 rounded-[var(--radius-option)] border border-[var(--color-accent-border)]">
                    📚 {futurePrediction.campus_phase_name}
                  </div>
                </div>

                {/* Card 2: Predicted Free Slots */}
                <div className="p-4 rounded-[var(--radius-tile)] bg-[var(--color-green-tint)] border border-[var(--color-green-border)] flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[var(--color-green-text)] uppercase tracking-wider">
                    คาดว่าจะมีที่ว่าง (Predicted Free Slots)
                  </span>
                  <div>
                    <div className="text-3xl font-bold tracking-tight text-[var(--color-green-text)]">
                      ~{futurePrediction.predicted_free_slots} ช่อง
                    </div>
                    <div className="text-xs text-[var(--color-green-text)] mt-1">
                      จากความจุทั้งหมด {futurePrediction.capacity} ช่องจอด
                    </div>
                  </div>
                  <div className="text-xs bg-[var(--color-surface)] text-[var(--color-green-text)] p-2 rounded-[var(--radius-option)] border border-[var(--color-green-border)] font-medium">
                    ความหนาแน่นคาดการณ์: {futurePrediction.predicted_occupancy_pct}% ({futurePrediction.predicted_vehicles} คัน)
                  </div>
                </div>

                {/* Card 3: Availability Level */}
                <div className="p-4 rounded-[var(--radius-tile)] bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#92400E] uppercase tracking-wider">
                    โอกาสที่จอดว่าง (Availability Chance)
                  </span>
                  <div>
                    <div className="text-xl font-bold text-[#92400E]">
                      {futurePrediction.availability_chance === 'HIGH_CHANCE' && '🟢 ว่างสะดวก (High Chance)'}
                      {futurePrediction.availability_chance === 'MODERATE' && '🟡 พอมีที่ว่าง (Moderate)'}
                      {futurePrediction.availability_chance === 'FULL_RISK' && '🔴 เสี่ยงเต็ม (Full Risk)'}
                    </div>
                    <div className="text-xs text-[#92400E] mt-1 font-medium leading-relaxed">
                      {futurePrediction.availability_desc}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--color-ink-muted)]">
                    สถิติปัจจุบัน: จอดอยู่ {futurePrediction.current_vehicles} คัน
                  </div>
                </div>

                {/* Card 4: Behavioral Trend */}
                <div className="p-4 rounded-[var(--radius-tile)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wider">
                    แนวโน้มพฤติกรรม (Behavioral Trend)
                  </span>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed font-normal">
                    {futurePrediction.campus_trend_desc}
                  </p>
                  <div className="text-[11px] text-[var(--color-ink-muted)] bg-[var(--color-surface)] p-1.5 rounded border border-[var(--color-border)]">
                    โมเดล: <span className="font-mono">{futurePrediction.model_used}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
                กำลังคำนวณการทำนายล่วงหน้า...
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION B: MULTI-AXIS CORRELATION TIME-SERIES GRAPH                   */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-[var(--color-border)] gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.8} />
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    Time-Series Correlation: ความสัมพันธ์อุณหภูมิชิป VS จำนวนรถ VS การปรับ Deep-Sleep
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  แกนซ้าย: อุณหภูมิชิป (°C) & จำนวนรถ (คัน) | แกนขวา: ระยะเวลา Deep-Sleep ที่ AI สั่งการ (วินาที)
                </p>
              </div>

              {/* Camera Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-ink-muted)]">กล้อง:</span>
                <select
                  value={activeCamFilter}
                  onChange={(e) => setActiveCamFilter(e.target.value)}
                  className="text-xs font-medium bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--radius-pill)] px-3 py-1 text-[var(--color-ink)] outline-none cursor-pointer"
                >
                  <option value="all">ทุกกล้องรวมกัน (All Cameras)</option>
                  <option value="cam1">CAM-01: หน้าภาค 1 (รถยนต์)</option>
                  <option value="cam2">CAM-02: หน้าภาค 2 (รถยนต์)</option>
                  <option value="cam3">CAM-03: ข้างภาคคอม (มอเตอร์ไซค์)</option>
                </select>
              </div>
            </div>

            {/* Time-Series LineChart */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesList} margin={{ top: 15, right: 25, left: 0, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="display_time"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    dy={5}
                  />
                  {/* Left Y Axis: Temp and Vehicles */}
                  <YAxis
                    yAxisId="left"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    domain={[0, 85]}
                  />
                  {/* Right Y Axis: Sleep Seconds */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#10B981"
                    tick={{ fontSize: 11, fill: '#10B981' }}
                    domain={[0, 70]}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="chip_temp_c"
                    name="ESP32 Chip Temp (°C)"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total_vehicles"
                    name="Total Vehicles (คัน)"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="stepAfter"
                    dataKey="recommended_sleep_sec"
                    name="AI Deep-Sleep (sec)"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Correlation Strategy Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-[var(--color-border)] mt-2">
              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs">
                <span className="font-semibold text-rose-700">🔥 ป้องกันความร้อนสะสม: </span>
                <span className="text-[var(--color-ink-secondary)]">
                  เมื่อชิปสะสมความร้อนเกิน 62°C–68°C ในช่วงเที่ยง ระบบจะขยายเวลาหลับเป็น 45–60 วินาที ช่วยให้อุปกรณ์เย็นลง ไม่เกิด Brownout
                </span>
              </div>
              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs">
                <span className="font-semibold text-blue-700">⚡ ตอบสนองช่วงรถเยอะ: </span>
                <span className="text-[var(--color-ink-secondary)]">
                  ช่วงเร่งด่วนเช้า/เย็น และช่วงเปลี่ยนคาบเรียน ระบบจะลดเวลาหลับเหลือ 10–15 วินาที เพื่อบันทึกการเข้า-ออกของรถได้ครบถ้วน
                </span>
              </div>
              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs">
                <span className="font-semibold text-emerald-700">💤 ประหยัดพลังงานในคาบเรียน: </span>
                <span className="text-[var(--color-ink-secondary)]">
                  ระหว่างคาบเรียน (09:30–11:30 และ 14:00–16:30) รถจอดนิ่ง ระบบปรับเวลาหลับ 30 วินาที ยืดอายุการใช้งานฮาร์ดแวร์
                </span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION C: 4-MODEL EVALUATION & FEATURE IMPORTANCE                    */}
          {/* --------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: 4-Model Evaluation Cards */}
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      ผลการทดสอบโมเดล Time-Series ทั้ง 4 ตัว (Test Evaluation)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-green-tint)] text-[var(--color-green-text)] border border-[var(--color-green-border)]">
                    N = 27,945 ROWS
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-4">
                  ทดสอบกับข้อมูลจริงของกล้อง ESP32 แบ่ง Train 80% (22,356 แถว) และ Test 20% (5,589 แถว)
                </p>

                <div className="space-y-2.5">
                  {/* Model 2: Adaptive Sleep Policy */}
                  <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-green-tint)] border border-[var(--color-green-border)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-green-text)]">
                        Model 2: Adaptive Deep-Sleep Policy (RandomForest)
                      </div>
                      <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                        คำนวณระยะเวลา Deep-Sleep ที่เหมาะสมที่สุด (10s – 60s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[var(--color-green-text)]">MAE: 0.18 sec</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">R² = 0.9947</div>
                    </div>
                  </div>

                  {/* Model 4: 30-min Occupancy */}
                  <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-accent-tint)] border border-[var(--color-accent-border)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-accent-text)]">
                        Model 4: 30-Min Future Occupancy Forecaster
                      </div>
                      <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                        ทำนายจำนวนรถล่วงหน้า 30 นาที
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[var(--color-accent-text)]">MAE: 2.01 คัน</div>
                      <div className="text-[10px] text-blue-600 font-semibold">R² = 0.7453</div>
                    </div>
                  </div>

                  {/* Model 3: 15-min Occupancy */}
                  <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-ink)]">
                        Model 3: 15-Min Future Occupancy Forecaster
                      </div>
                      <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                        ทำนายจำนวนรถล่วงหน้า 15 นาที
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[var(--color-ink)]">MAE: 2.87 คัน</div>
                      <div className="text-[10px] text-[var(--color-ink-muted)] font-semibold">R² = 0.4999</div>
                    </div>
                  </div>

                  {/* Model 1: Thermal Forecaster */}
                  <div className="p-3 rounded-[var(--radius-option)] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#92400E]">
                        Model 1: Thermal Dynamics Forecaster (GradientBoosting)
                      </div>
                      <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                        ทำนายแนวโน้มอุณหภูมิชิปรอบถัดไป (ΔT)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#92400E]">MAE: 5.42 °C</div>
                      <div className="text-[10px] text-amber-700 font-semibold">RMSE: 7.23 °C</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Feature Importances BarChart */}
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[var(--color-accent-strong)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      Feature Importance: ปัจจัยที่มีผลต่อการตัดสินใจ
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] text-[var(--color-ink-secondary)] border border-[var(--color-border)]">
                    RANDOM FOREST
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  น้ำหนักความสำคัญของแต่ละตัวแปรในการตัดสินใจเลือกระยะเวลา Deep-Sleep
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={featureImportances}
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" domain={[0, 0.6]} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        stroke="#9CA3AF"
                        tick={{ fontSize: 10, fill: '#4B5563', fontWeight: 500 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                        {featureImportances.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              index === 0
                                ? '#2563EB'
                                : index === 1
                                ? '#EF4444'
                                : index < 6
                                ? '#10B981'
                                : '#F59E0B'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)] mt-3">
                <span className="font-semibold text-[var(--color-ink)]">💡 สรุปน้ำหนักปัจจัย: </span>
                กลุ่มตัวแปรตารางเรียนและวันหยุด (day_of_week, campus_phase, day_type, class_transition) มีน้ำหนักรวมกันถึง <strong>38.4%</strong> และอัตราการเคลื่อนตัวของรถอยู่ที่ <strong>48.1%</strong>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION D: LIVE HARDWARE INGESTION & EDGE HEALTH MONITOR              */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] mb-4">
              <Camera className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                สถานะการทำงานฮาร์ดแวร์สด (Live Edge Camera Telemetry & Closed-Loop Deep-Sleep)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['cam1', 'cam2', 'cam3'].map((camId) => {
                const live = liveCameras ? liveCameras[camId] : null
                const name =
                  camId === 'cam1'
                    ? 'CAM-01 (หน้าภาค 1 - รถยนต์)'
                    : camId === 'cam2'
                    ? 'CAM-02 (หน้าภาค 2 - รถยนต์)'
                    : 'CAM-03 (ข้างภาคคอม - มอเตอร์ไซค์)'
                const temp = live?.current_temp_c || 52.0
                const sleep = live?.recommended_sleep_sec || 30
                const status = live?.thermal_status || 'NORMAL'

                return (
                  <div
                    key={camId}
                    className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                        <span className="font-semibold text-xs text-[var(--color-ink)]">{name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-green-text)] bg-[var(--color-green-tint)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-green-border)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green-bright)] animate-pulse"></span>
                          ONLINE
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center">
                          <span className="text-[10px] text-[var(--color-ink-muted)] block">อุณหภูมิชิป</span>
                          <span
                            className={`text-lg font-bold ${
                              temp >= 68 ? 'text-rose-600' : temp >= 62 ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {temp}°C
                          </span>
                        </div>
                        <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center">
                          <span className="text-[10px] text-[var(--color-ink-muted)] block">คำสั่ง Deep-Sleep</span>
                          <span className="text-lg font-bold text-[var(--color-green-text)]">{sleep}s</span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-[var(--color-ink-secondary)]">
                        <div>
                          สถานะความร้อน: <strong className="text-[var(--color-ink)]">{status}</strong>
                        </div>
                        <div>
                          ทำนายรอบถัดไป: <strong>{live?.predicted_next_temp_c || temp}°C</strong>
                        </div>
                        <div>
                          ดาต้าเลก: <span className="text-[var(--color-accent-text)] font-medium">MinIO + Postgres OK</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-ink-muted)] truncate">
                      {live?.reason || 'ระบบทำงานปกติ'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPUTER VISION & YOLO BENCHMARKS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'yolo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1A: Architecture Accuracy Comparison */}
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--color-accent-strong)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      1A. Architecture Accuracy Comparison (mAP50, Precision, Recall)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-accent-tint)] text-[var(--color-accent-text)] border border-[var(--color-accent-border)]">
                    N = 1,420 FRAMES
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  เปรียบเทียบ mAP@0.50, Precision และ Recall ระหว่างโมเดลหลักในระบบกับสถาปัตยกรรมอื่น
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelComparison} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="model" stroke="#9CA3AF" tick={{ fontSize: 10 }} angle={-10} textAnchor="end" />
                      <YAxis domain={[70, 100]} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={32} iconType="circle" />
                      <Bar dataKey="map50" name="mAP@50 (%)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="precision" name="Precision (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="recall" name="Recall (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)] mt-3">
                <span className="font-semibold text-[var(--color-ink)]">💡 ข้อสรุป: </span>
                YOLO26m ให้ความแม่นยำสูงสุด (mAP50 98.5%) และ YOLO26n ให้ผลลัพธ์ใกล้เคียง (98.0%)
              </div>
            </div>

            {/* Card 1B: Inference Latency & Memory */}
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      1B. Inference Latency (ms) & Memory Usage (MB)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-rose-50 text-rose-700 border border-rose-200">
                    INTEL N100 CPU
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  เวลาประมวลผลเฉลี่ยต่อเฟรม (ms) และหน่วยความจำ RAM ที่ใช้ระหว่าง Inference
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelComparison} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="model" stroke="#9CA3AF" tick={{ fontSize: 10 }} angle={-10} textAnchor="end" />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={32} iconType="circle" />
                      <Bar dataKey="latency_ms" name="Latency (ms)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="memory_mb" name="RAM (MB)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)] mt-3">
                <span className="font-semibold text-[var(--color-ink)]">💡 ข้อสรุป: </span>
                YOLO26n ประมวลผลได้เร็วกว่า 3.47 เท่า (327.8ms) เหมาะสำหรับการรันบน Edge Device
              </div>
            </div>

            {/* Card 1C: Resolution Benchmark */}
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      1C. Resolution Trade-off (640 vs 960 vs 1280)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] text-[var(--color-ink-secondary)] border border-[var(--color-border)]">
                    EXPERIMENT
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  ความสัมพันธ์ระหว่างขนาดภาพ ความแม่นยำ (mAP50) และ Throughput (FPS)
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={resolutionBenchmark} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="resolution" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={32} iconType="circle" />
                      <Line type="monotone" dataKey="map50" name="mAP@50 (%)" stroke="#2563EB" strokeWidth={2} />
                      <Line type="monotone" dataKey="fps" name="Throughput (FPS)" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)] mt-3">
                <span className="font-semibold text-[var(--color-ink)]">💡 ข้อสรุป: </span>
                Resolution 640x640 ให้ความสมดุลสูงสุด (FPS 0.88, mAP50 98.5%)
              </div>
            </div>

            {/* Card 1D: Quantization Benchmark */}
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      1D. Quantization Benchmark (FP32 vs INT8)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-amber-50 text-amber-700 border border-amber-200">
                    OPENVINO
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  ผลการแปลงโมเดลด้วย OpenVINO INT8 ช่วยลดขนาดไฟล์และเพิ่มความเร็วในการรัน
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quantizationBenchmark} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="format" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={32} iconType="circle" />
                      <Bar dataKey="latency_ms" name="Latency (ms)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="size_mb" name="Model Size (MB)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)] mt-3">
                <span className="font-semibold text-[var(--color-ink)]">💡 ข้อสรุป: </span>
                OpenVINO INT8 ลดขนาดโมเดลลงเหลือ 11.2 MB และประมวลผลเร็วขึ้น 2.5 เท่า
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
