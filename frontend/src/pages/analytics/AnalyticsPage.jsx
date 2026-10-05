import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Activity,
  Cpu,
  RefreshCw,
  TrendingUp,
  Wifi,
  Thermometer,
  Layers,
  Zap,
  Clock,
  Car,
  Bike,
  HardDrive,
  Database,
  CheckCircle2,
  AlertCircle,
  PieChart as PieIcon,
  ShieldCheck,
  Camera,
  Sliders,
  Sun,
  Eye,
  BarChart3,
  Gauge
} from 'lucide-react'

export default function AnalyticsPage({ apiBase = '' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [hoursFilter, setHoursFilter] = useState(48)
  const [activeCamFilter, setActiveCamFilter] = useState('all') // 'all', 'cam1', 'cam2', 'cam3'

  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/analytics/data?hours=${hoursFilter}`)
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err.message || 'Error connecting to analytics backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [hoursFilter])

  // Data sets
  const modelComparison = data?.model_comparison || [
    { model: 'YOLO26m (Fine-Tuned)', map50: 98.5, precision: 97.8, recall: 96.5, latency_ms: 1136.6, memory_mb: 344.0, size_mb: 41.97 },
    { model: 'YOLO26n (Nano Base)', map50: 98.0, precision: 96.8, recall: 95.8, latency_ms: 327.8, memory_mb: 2.5, size_mb: 5.29 },
    { model: 'SSD MobileNetV2', map50: 84.2, precision: 81.5, recall: 78.0, latency_ms: 410.2, memory_mb: 14.8, size_mb: 19.5 },
    { model: 'Faster R-CNN', map50: 94.1, precision: 93.0, recall: 91.2, latency_ms: 2850.0, memory_mb: 580.0, size_mb: 160.0 },
  ]

  const trainingConvergence = data?.training_convergence || []
  const resolutionBenchmark = data?.resolution_benchmark || []
  const quantizationBenchmark = data?.quantization_benchmark || []
  const flickerStability = data?.flicker_stability || []
  const vehicleDistribution = data?.vehicle_distribution || []
  const networkImpact = data?.network_impact || []
  const iotHealth = data?.iot_health || []
  const telemetrySeries = data?.telemetry || []
  const occupancySeries = data?.occupancy || []
  const summary = data?.summary || {}

  const PIE_COLORS = ['#2F6BFF', '#10B981', '#F59E0B']

  // Tooltip custom style
  const tooltipStyle = {
    backgroundColor: '#FFFFFF',
    border: '2px solid #212529',
    borderRadius: '4px',
    boxShadow: '3px 3px 0px #212529',
    fontFamily: 'monospace',
    fontSize: '11px',
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#212529] p-4 md:p-8 font-sans">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between border-b-2 border-[#212529] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#2F6BFF] text-white font-mono text-xs font-bold uppercase rounded-sm border border-[#212529] shadow-[2px_2px_0px_#212529]">
              AI INTELLIGENCE & TELEMETRY HUB
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              MULTI-CAMERA LIVE TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 text-[#212529]">
            CPE Smart Campus Analytics & AI Telemetry
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            ศูนย์รวมการวิเคราะห์ข้อมูล AI โมเดล, ความแม่นยำ, ประสิทธิภาพฮาร์ดแวร์ Edge, และสถิติการจอดรถแยกรายกล้อง
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border-2 border-[#212529] rounded px-3 py-1.5 shadow-[2px_2px_0px_#212529]">
            <Clock className="w-4 h-4 text-neutral-500" />
            <select
              value={hoursFilter}
              onChange={(e) => setHoursFilter(Number(e.target.value))}
              className="text-xs font-mono font-bold bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value={12}>Past 12 Hours</option>
              <option value={24}>Past 24 Hours</option>
              <option value={48}>Past 48 Hours</option>
              <option value={72}>Past 72 Hours</option>
              <option value={168}>Past 7 Days</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F6BFF] text-white font-semibold text-xs uppercase tracking-wider rounded border-2 border-[#212529] shadow-[3px_3px_0px_#212529] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#212529] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {lastRefreshed && (
        <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-600 font-mono gap-1">
          <span>Synced: {lastRefreshed.toLocaleTimeString()} | Range: Past {hoursFilter} Hours</span>
          <span>Indexed: {summary.total_telemetry_records?.toLocaleString() || 0} Telemetry Frames · {summary.total_detection_records?.toLocaleString() || 0} Detections</span>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-50 border-2 border-rose-500 rounded text-rose-800 flex items-center gap-3 shadow-[3px_3px_0px_#212529]">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div>
            <p className="font-bold text-sm">Failed to retrieve real-time analytics</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: AI MODEL ACCURACY, BENCHMARKS & CONVERGENCE                   */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-[#212529]">
          <Cpu className="w-5 h-5 text-[#2F6BFF]" />
          <h2 className="text-lg font-black uppercase text-[#212529]">
            ส่วนที่ 1: การประเมินประสิทธิภาพและความแม่นยำของ AI โมเดล (Model Accuracy & Benchmarks)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1A: Model Accuracy & Metric Showdown */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#2F6BFF]" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    1A. Model Accuracy & Speed Showdown (mAP@50 vs Latency)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-[#2F6BFF] border border-[#2F6BFF] rounded">
                  BENCHMARK
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                เปรียบเทียบค่าความแม่นยำ <strong>mAP@50 (%)</strong>, <strong>Precision</strong>, <strong>Recall</strong> และ <strong>Inference Latency (ms)</strong> ของโมเดลต่างๆ
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelComparison} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="model" stroke="#212529" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis stroke="#212529" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} />
                    <Bar dataKey="map50" name="mAP@50 (%)" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="precision" name="Precision (%)" fill="#2F6BFF" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="recall" name="Recall (%)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สรุปผลการทดสอบ: </span>
              <span className="text-neutral-600">YOLO26m ให้ mAP สูงสุดที่ <strong>98.5%</strong> ขณะที่ YOLO26n ทำความเร็วได้เร็วกว่า <strong>3.47 เท่า</strong> (327.8ms vs 1136.6ms) เหมาะกับระบบ Edge ที่ทรัพยากรจำกัด</span>
            </div>
          </div>

          {/* Card 1B: Training Loss & mAP Convergence (50 Epochs) */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    1B. Training Loss & Accuracy Convergence Curves
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-300 rounded">
                  50 EPOCHS
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                แนวโน้มการลดลงของ <strong>Loss</strong> และการเพิ่มขึ้นของ <strong>mAP@50</strong> ตลอดการเทรนบนชุดข้อมูล Smart Campus
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trainingConvergence} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="epoch" stroke="#212529" tick={{ fontSize: 10 }} label={{ value: 'Epoch', position: 'insideBottomRight', offset: -5 }} />
                    <YAxis yAxisId="loss" stroke="#EF4444" tick={{ fontSize: 10 }} label={{ value: 'Loss', angle: -90, position: 'insideLeft', fill: '#EF4444', fontSize: 10 }} />
                    <YAxis yAxisId="map" orientation="right" domain={[50, 100]} stroke="#10B981" tick={{ fontSize: 10 }} label={{ value: 'mAP@50 (%)', angle: 90, position: 'insideRight', fill: '#10B981', fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} />
                    <Line yAxisId="loss" type="monotone" dataKey="train_loss" name="Train Loss" stroke="#EF4444" strokeWidth={2} dot={false} />
                    <Line yAxisId="loss" type="monotone" dataKey="val_loss" name="Val Loss" stroke="#F97316" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    <Line yAxisId="map" type="monotone" dataKey="map50" name="mAP@50 (%)" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สรุปผล Convergence: </span>
              <span className="text-neutral-600">โมเดลลู่เข้า (Converge) อย่างเสถียรที่ประมาณ <strong>Epoch 25</strong> โดย Loss ลดลงจาก 2.45 เหลือ 0.56 และ mAP พุ่งขึ้นแตะ 98.5% โดยไม่เกิด Overfitting</span>
            </div>
          </div>

          {/* Card 1C: Resolution Scaling Trade-off */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    1C. Resolution Scaling Trade-off (640 vs 960 vs 1280)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded">
                  TASK 3 EMPIRICAL
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                ผลกระทบของขนาดภาพ Inference ต่อ <strong>จำนวนมอเตอร์ไซค์ที่ตรวจพบ</strong> เทียบกับ <strong>Cycle Budget Utilization (%)</strong>
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resolutionBenchmark} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="resolution" stroke="#212529" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis stroke="#212529" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} />
                    <Bar dataKey="total_motos" name="Total Motos Detected" fill="#2F6BFF" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="budget_utilization_pct" name="Cycle Budget Used (%)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สรุปการเลือก Resolution: </span>
              <span className="text-neutral-600">ความละเอียด <strong>960x960</strong> ตรวจพบมอเตอร์ไซค์เพิ่มขึ้นจาก 24 เป็น 36.6 คัน (+52%) โดยใช้เวลาเพียง 2.21 วินาที (กิน Budget แค่ 8.8% ของรอบ 25s)</span>
            </div>
          </div>

          {/* Card 1D: Quantization & Runtime Engine */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    1D. Runtime Engine & INT8 Quantization Benchmark
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-300 rounded">
                  OPENVINO vs PYTORCH
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                เปรียบเทียบความเร็ว <strong>Latency (ms)</strong>, <strong>ขนาดโมเดล (MB)</strong> และ <strong>Slot Flip Error Rate (%)</strong>
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quantizationBenchmark} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="runtime" stroke="#212529" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis stroke="#212529" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} />
                    <Bar dataKey="latency_ms" name="Latency (ms)" fill="#0D9488" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="size_mb" name="Model Size (MB)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="flip_rate_pct" name="Flip Rate (%)" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สรุปผล Quantization: </span>
              <span className="text-neutral-600">OpenVINO INT8 ลด Latency เหลือ <strong>320.5ms</strong> (ลดลง 46%) โดยแลกกับ Flip Rate เพียง 6.6% เหมาะอย่างยิ่งสำหรับการ Deploy บน CPU Edge</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: MULTI-CAMERA EDGE TELEMETRY & TRAFFIC (WITH CAMERA SELECTOR)   */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-2 border-b-2 border-[#212529] gap-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black uppercase text-[#212529]">
              ส่วนที่ 2: สถิติการจอดรถและฮาร์ดแวร์ IoT (เลือกระบุกล้องได้)
            </h2>
          </div>

          {/* Interactive Camera Selector Filter */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded border-2 border-[#212529] shadow-[2px_2px_0px_#212529] text-xs font-mono font-bold">
            <span className="text-neutral-500 px-2 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>Camera:</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveCamFilter('all')}
              className={`px-2.5 py-1 rounded transition-all ${activeCamFilter === 'all' ? 'bg-[#212529] text-white shadow-sm' : 'hover:bg-neutral-100'}`}
            >
              All (3x)
            </button>
            <button
              type="button"
              onClick={() => setActiveCamFilter('cam1')}
              className={`px-2.5 py-1 rounded transition-all ${activeCamFilter === 'cam1' ? 'bg-[#2F6BFF] text-white shadow-sm' : 'hover:bg-neutral-100 text-[#2F6BFF]'}`}
            >
              CAM-01 (หน้า 1)
            </button>
            <button
              type="button"
              onClick={() => setActiveCamFilter('cam2')}
              className={`px-2.5 py-1 rounded transition-all ${activeCamFilter === 'cam2' ? 'bg-[#10B981] text-white shadow-sm' : 'hover:bg-neutral-100 text-[#10B981]'}`}
            >
              CAM-02 (หน้า 2)
            </button>
            <button
              type="button"
              onClick={() => setActiveCamFilter('cam3')}
              className={`px-2.5 py-1 rounded transition-all ${activeCamFilter === 'cam3' ? 'bg-[#8B5CF6] text-white shadow-sm' : 'hover:bg-neutral-100 text-[#8B5CF6]'}`}
            >
              CAM-03 (ข้างภาค)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 2A: Parking Occupancy Rate (%) Over Time */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    2A. Parking Occupancy Rate (%) Over Time
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-300 rounded uppercase">
                  {activeCamFilter === 'all' ? 'All Cameras' : activeCamFilter}
                </span>
              </div>
              
              <p className="text-xs text-neutral-600 mb-3">
                อัตราการเข้าจอดรายชั่วโมง (% Occupancy) คำนวณจาก <span className="font-mono font-bold text-[#212529]">(จำนวนรถที่ตรวจพบ / ความจุโซน) × 100</span>
              </p>

              {/* Capacity Indicators */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-[11px] font-mono">
                <div className={`p-1.5 rounded border transition-all ${activeCamFilter === 'cam1' || activeCamFilter === 'all' ? 'border-blue-300 bg-blue-50/50' : 'opacity-40 border-neutral-200'}`}>
                  <span className="font-bold text-[#2F6BFF] block">CAM-01: ลานหน้า 1</span>
                  <span className="text-neutral-600">6 ช่อง (รถยนต์)</span>
                </div>
                <div className={`p-1.5 rounded border transition-all ${activeCamFilter === 'cam2' || activeCamFilter === 'all' ? 'border-emerald-300 bg-emerald-50/50' : 'opacity-40 border-neutral-200'}`}>
                  <span className="font-bold text-[#10B981] block">CAM-02: ลานหน้า 2</span>
                  <span className="text-neutral-600">5 ช่อง (รถยนต์)</span>
                </div>
                <div className={`p-1.5 rounded border transition-all ${activeCamFilter === 'cam3' || activeCamFilter === 'all' ? 'border-purple-300 bg-purple-50/50' : 'opacity-40 border-neutral-200'}`}>
                  <span className="font-bold text-[#8B5CF6] block">CAM-03: ลานข้างภาค</span>
                  <span className="text-neutral-600">25 ช่อง (มอไซค์)</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancySeries} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="display_time" stroke="#212529" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} stroke="#212529" tick={{ fontSize: 10 }} label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft', fill: '#B45309', fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={36} />
                    {(activeCamFilter === 'all' || activeCamFilter === 'cam1') && (
                      <Line type="monotone" dataKey="cam1_occ" name="CAM-01 ลานหน้า 1 (%)" stroke="#2F6BFF" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {(activeCamFilter === 'all' || activeCamFilter === 'cam2') && (
                      <Line type="monotone" dataKey="cam2_occ" name="CAM-02 ลานหน้า 2 (%)" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {(activeCamFilter === 'all' || activeCamFilter === 'cam3') && (
                      <Line type="monotone" dataKey="cam3_occ" name="CAM-03 ลานข้างภาค (%)" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {activeCamFilter === 'all' && (
                      <Line type="monotone" dataKey="avg_occ" name="ภาพรวมเฉลี่ย (Avg %)" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-3 rounded border border-neutral-300 text-xs">
              <div className="font-bold text-[#212529] mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>การนำค่า Occupancy Rate ไปใช้:</span>
              </div>
              <ul className="text-[11px] text-neutral-600 space-y-1 list-disc list-inside leading-relaxed">
                <li><strong>0% - 60%:</strong> ลานว่าง ผู้ใช้งานตรงเข้าจอดได้ทันที</li>
                <li><strong>61% - 85%:</strong> เริ่มหนาแน่น LINE Bot จะแนะนำให้ตรวจสอบลานข้างเคียง</li>
                <li><strong>86% - 100%:</strong> เต็มแล้ว ระบบจะขึ้นสถานะสีแดงและแนะนำเปลี่ยนจุดจอด</li>
              </ul>
            </div>
          </div>

          {/* Card 2B: Vehicle Class Breakdown Over Time */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    2B. Vehicle Classification Volume Over Time
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded">
                  CARS vs BIKES
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                จำนวนรถยนต์และรถจักรยานยนต์ที่ระบบ AI ตรวจพบตามช่วงเวลา {activeCamFilter !== 'all' && `(เฉพาะกล้อง ${activeCamFilter.toUpperCase()})`}
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={occupancySeries} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorBikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCars" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="display_time" stroke="#212529" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#212529" tick={{ fontSize: 10 }} label={{ value: 'Vehicles (Count)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} />
                    <Area
                      type="monotone"
                      dataKey={activeCamFilter === 'cam1' ? 'cam1_motos' : (activeCamFilter === 'cam2' ? 'cam2_motos' : (activeCamFilter === 'cam3' ? 'cam3_motos' : 'motorcycles'))}
                      name="Motorcycles"
                      stroke="#2F6BFF"
                      fillOpacity={1}
                      fill="url(#colorBikes)"
                    />
                    <Area
                      type="monotone"
                      dataKey={activeCamFilter === 'cam1' ? 'cam1_cars' : (activeCamFilter === 'cam2' ? 'cam2_cars' : (activeCamFilter === 'cam3' ? 'cam3_cars' : 'cars'))}
                      name="Cars / SUVs"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorCars)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สัดส่วนประเภทยานพาหนะ: </span>
              <span className="text-neutral-600">รถจักรยานยนต์ครองสัดส่วน <strong>81.2%</strong> ของพื้นที่ลานจอดทั้งหมด ขณะที่รถยนต์คิดเป็น <strong>18.8%</strong></span>
            </div>
          </div>

          {/* Card 2C: IoT Hardware Telemetry (Temp & WiFi by Camera) */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-rose-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    2C. IoT Hardware Telemetry (Temp & WiFi per Camera)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-300 rounded">
                  DUAL AXIS
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                อุณหภูมิชิป ESP32 (°C) และความแรงสัญญาณ WiFi RSSI (dBm) เพื่อตรวจจับ Thermal Stress
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetrySeries} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="display_time" stroke="#212529" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="left" domain={[30, 85]} stroke="#E11D48" tick={{ fontSize: 10 }} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#E11D48', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[-95, -40]} stroke="#2F6BFF" tick={{ fontSize: 10 }} label={{ value: 'RSSI (dBm)', angle: 90, position: 'insideRight', fill: '#2F6BFF', fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={36} />
                    {(activeCamFilter === 'all' || activeCamFilter === 'cam1') && (
                      <Line yAxisId="left" type="monotone" dataKey="cam1_temp" name="CAM-01 Temp (°C)" stroke="#EF4444" strokeWidth={2} dot={false} />
                    )}
                    {(activeCamFilter === 'all' || activeCamFilter === 'cam2') && (
                      <Line yAxisId="left" type="monotone" dataKey="cam2_temp" name="CAM-02 Temp (°C)" stroke="#F97316" strokeWidth={2} dot={false} />
                    )}
                    {(activeCamFilter === 'all' || activeCamFilter === 'cam3') && (
                      <Line yAxisId="left" type="monotone" dataKey="cam3_temp" name="CAM-03 Temp (°C)" stroke="#EC4899" strokeWidth={2} dot={false} />
                    )}
                    <Line yAxisId="right" type="monotone" dataKey="avg_rssi" name="Avg WiFi RSSI (dBm)" stroke="#2F6BFF" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สุขภาพฮาร์ดแวร์: </span>
              <span className="text-neutral-600">อุณหภูมิเฉลี่ย 45°C - 75°C อยู่ในเกณฑ์ปลอดภัย สัญญาณ WiFi อยู่ที่ -78 dBm ส่งข้อมูลได้ลื่นไหลไม่มี Packet Loss</span>
            </div>
          </div>

          {/* Card 2D: Detection Stability & Flicker Rate per Camera */}
          <div className="bg-white p-6 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-black uppercase text-[#212529]">
                    2D. Detection Stability & Frame Flicker Rate (%)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-300 rounded">
                  EMPIRICAL FLICKER
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                ความเสถียรของการตรวจจับข้ามเฟรม (Frame Stability Score vs Flicker % เมื่อแสงเปลี่ยน)
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flickerStability} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="camera" stroke="#212529" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} stroke="#212529" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} />
                    <Bar dataKey="stability_score" name="Stability Score (%)" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="flicker_pct" name="Flicker Rate (%)" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 bg-[#FDFBF7] p-2.5 rounded border border-neutral-300 text-xs">
              <span className="font-bold text-[#212529]">💡 สรุปความเสถียร: </span>
              <span className="text-neutral-600">CAM-03 ทำ Stability ได้เต็ม <strong>100%</strong> (Flicker 0%) และ CAM-02 ทำได้ <strong>99.78%</strong> มีความเสถียรสูงมากสำหรับการส่งแจ้งเตือน LINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
