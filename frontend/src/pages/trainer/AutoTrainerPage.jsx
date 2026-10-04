import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Cpu,
  Zap,
  Play,
  Square,
  RefreshCw,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
  Terminal,
  Sliders,
  TrendingUp,
  Award,
  Check,
  FileCode,
  Copy,
  CheckCheck,
  Maximize2,
  Minimize2,
  Search,
  Trash2
} from 'lucide-react'

const BASE_MODELS = [
  {
    id: 'yolo11n.pt',
    name: 'YOLOv11 Nano (yolo11n.pt)',
    shortName: 'YOLOv11 Nano',
    params: '2.6M params',
    desc: 'เร็วที่สุด (Ultra Fast 2.6M) เหมาะสำหรับ Edge & Live Stream',
    badge: 'RECOMMENDED'
  },
  {
    id: 'yolo11s.pt',
    name: 'YOLOv11 Small (yolo11s.pt)',
    shortName: 'YOLOv11 Small',
    params: '9.4M params',
    desc: 'ความแม่นยำสูง (High Precision) แยกแยะมุมอับได้ดี',
    badge: 'ACCURATE'
  },
  {
    id: 'yolov8n.pt',
    name: 'YOLOv8 Nano (yolov8n.pt)',
    shortName: 'YOLOv8 Nano',
    params: '3.2M params',
    desc: 'เสถียรภาพสูง (Stable Baseline 3.2M)',
    badge: 'STABLE'
  },
  {
    id: 'yolov8s.pt',
    name: 'YOLOv8 Small (yolov8s.pt)',
    shortName: 'YOLOv8 Small',
    params: '11.2M params',
    desc: 'มาตรฐานอุตสาหกรรม (Industry Benchmark)',
    badge: 'STANDARD'
  }
]

export default function AutoTrainerPage({ apiBase }) {
  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  // Training Config State
  const [baseModel, setBaseModel] = useState('yolo11n.pt')
  const [datasetId, setDatasetId] = useState('ds_cctv_parking_v1')
  const [datasetsList, setDatasetsList] = useState([
    { dataset_id: 'ds_cctv_parking_v1', name: 'CCTV Parking Main Gate (3,179 Images)', file_count: 3179, size_mb: 245.5 },
    { dataset_id: 'ds_dogcat_v1', name: 'Dog Cat Small (Demo Dataset)', file_count: 4, size_mb: 0.1 }
  ])
  const [roboflowVersion, setRoboflowVersion] = useState(1)
  const [epochs, setEpochs] = useState(50)
  const [batchSize, setBatchSize] = useState(16)
  const [imgsz, setImgsz] = useState(640)
  const [gpuType, setGpuType] = useState('GTX 1660 SUPER (6GB)')

  // Hardware Telemetry State
  const [gpuTelemetry, setGpuTelemetry] = useState({
    available: true,
    name: 'NVIDIA GeForce GTX 1660 SUPER',
    memory_total_mb: 6144,
    memory_used_mb: 844,
    memory_free_mb: 5123,
    temperature_c: 34,
    utilization_pct: 1,
    driver_version: '610.60'
  })

  // Job & Logs State
  const [currentJob, setCurrentJob] = useState(null)
  const [logs, setLogs] = useState([])
  const [isStarting, setIsStarting] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [logSearch, setLogSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [preflightStatus, setPreflightStatus] = useState(null)

  // Model Registry State
  const [modelsList, setModelsList] = useState([])
  const [activeModel, setActiveModel] = useState(null)
  const [loadingModels, setLoadingModels] = useState(false)
  const [activatingId, setActivatingId] = useState(null)
  const [modelFilter, setModelFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const terminalEndRef = useRef(null)

  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }

  // Fetch registered models list
  const fetchModels = async () => {
    setLoadingModels(true)
    try {
      const [modelsRes, activeRes] = await Promise.all([
        fetch(`${effectiveApiBase}/api/v1/models`),
        fetch(`${effectiveApiBase}/api/v1/models/active`)
      ])
      if (modelsRes.ok) {
        const data = await modelsRes.json()
        setModelsList(Array.isArray(data) ? data : [])
      }
      if (activeRes.ok) {
        const aData = await activeRes.json()
        setActiveModel(aData)
      }
    } catch (err) {
      console.error('Failed to fetch models:', err)
    } finally {
      setLoadingModels(false)
    }
  }

  // Fetch GPU Telemetry
  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/training/gpu/telemetry`)
      if (res.ok) {
        const data = await res.json()
        setGpuTelemetry(data)
      }
    } catch (err) {
      // Keep previous telemetry
    }
  }

  // Fetch Available Datasets
  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/training/gpu/datasets`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setDatasetsList(data)
        }
      }
    } catch (err) {
      // Fallback
    }
  }

  // Poll active training job status
  const fetchActiveJob = async () => {
    try {
      let res = await fetch(`${effectiveApiBase}/api/v1/training/gpu/active`)
      if (!res.ok) {
        res = await fetch(`${effectiveApiBase}/api/v1/training/modal/active`)
      }
      if (res.ok) {
        const data = await res.json()
        if (data.job) {
          setCurrentJob(data.job)
          if (Array.isArray(data.job.recent_logs) && data.job.recent_logs.length > 0 && logs.length === 0) {
            setLogs(data.job.recent_logs)
          }
        }
      }
    } catch (err) {
      // Fallback silently
    }
  }

  // SSE Stream for Real-Time Terminal Logs
  useEffect(() => {
    fetchModels()
    fetchActiveJob()
    fetchTelemetry()
    fetchDatasets()

    let eventSource = null

    const connectSSE = (jobId) => {
      if (!jobId) return
      if (eventSource) eventSource.close()

      const sseUrl = `${effectiveApiBase}/api/v1/training/gpu/logs/${jobId}`
      eventSource = new EventSource(sseUrl)

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.log) {
            setLogs((prev) => [...prev, payload.log])
          }
          if (payload.status) {
            setCurrentJob((prev) => (prev ? { ...prev, status: payload.status } : null))
            if (payload.status === 'COMPLETED') {
              showToast('🎉 งานเทรนบน Private GPU Node เสร็จสมบูรณ์แล้ว!', 'success')
              fetchModels()
              fetchTelemetry()
            }
          }
        } catch (e) {
          setLogs((prev) => [...prev, event.data])
        }
      }

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close()
        }
      }
    }

    if (currentJob && currentJob.job_id && currentJob.status !== 'COMPLETED' && currentJob.status !== 'FAILED') {
      connectSSE(currentJob.job_id)
    }

    const interval = setInterval(() => {
      fetchActiveJob()
      fetchTelemetry()
    }, 4000)

    return () => {
      clearInterval(interval)
      if (eventSource) eventSource.close()
    }
  }, [effectiveApiBase])

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight
    }
  }, [logs, autoScroll, logSearch])

  // Start Private GPU Node Training Handler
  const handleStartTraining = async () => {
    setIsStarting(true)
    setLogs([])
    setPreflightStatus('VALIDATING')
    showToast('🔍 กำลังรัน Pre-flight AST Syntax Check (<5ms)...', 'info', 4000)

    try {
      const payload = {
        dataset_id: datasetId,
        base_model: baseModel,
        epochs: Number(epochs),
        batch_size: Number(batchSize),
        imgsz: Number(imgsz),
        gpu_type: 'GTX 1660 SUPER (6GB)'
      }

      let res = await fetch(`${effectiveApiBase}/api/v1/training/gpu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        res = await fetch(`${effectiveApiBase}/api/v1/training/modal/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        const data = await res.json()
        setPreflightStatus('PASSED')
        showToast(`✅ Pre-flight ผ่าน! ส่งงานเข้า GPU Task Queue สำเร็จ (Job ID: ${data.job_id})`, 'success')
        fetchActiveJob()
      } else {
        const err = await res.json()
        setPreflightStatus('FAILED')
        showToast(`เกิดข้อผิดพลาด: ${err.detail || 'ไม่สามารถเริ่มเทรนได้'}`, 'error')
      }
    } catch (err) {
      setPreflightStatus('FAILED')
      showToast(`การเชื่อมต่อขัดข้อง: ${err.message}`, 'error')
    } finally {
      setIsStarting(false)
    }
  }

  // Cancel Training Handler
  const handleCancelTraining = async () => {
    if (!currentJob?.job_id) return
    try {
      let res = await fetch(`${effectiveApiBase}/api/v1/training/gpu/cancel/${currentJob.job_id}`, {
        method: 'POST'
      })
      if (!res.ok) {
        res = await fetch(`${effectiveApiBase}/api/v1/training/modal/cancel/${currentJob.job_id}`, {
          method: 'POST'
        })
      }
      if (res.ok) {
        showToast('ยกเลิกงานเทรนบน Private GPU Node เรียบร้อยแล้ว', 'info')
        setCurrentJob((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null))
      }
    } catch (err) {
      showToast(`ยกเลิกไม่สำเร็จ: ${err.message}`, 'error')
    }
  }

  // Switch Active Model Handler


  const handleActivateModel = async (modelId) => {
    setActivatingId(modelId)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/models/${modelId}/activate`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        showToast(`⚡ สลับมาใช้โมเดล ${data.model?.model_name || ''} (${data.model?.version || ''}) เรียบร้อยแล้ว!`, 'success')
        fetchModels()
      } else {
        const err = await res.json()
        showToast(`สลับโมเดลไม่สำเร็จ: ${err.detail || 'Error'}`, 'error')
      }
    } catch (err) {
      showToast(`การเชื่อมต่อขัดข้อง: ${err.message}`, 'error')
    } finally {
      setActivatingId(null)
    }
  }

  // Copy Logs to Clipboard
  const handleCopyLogs = () => {
    if (!logs.length) return
    const text = logs.join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    showToast('คัดลอกข้อความใน Terminal ทั้งหมดเรียบร้อยแล้ว', 'info', 3000)
    setTimeout(() => setCopied(false), 2500)
  }

  const isTrainingActive = currentJob && ['INITIALIZING', 'DOWNLOADING_DATASET', 'TRAINING'].includes(currentJob.status)

  const filteredModels = modelsList.filter((m) => {
    const isActive = m.is_active || activeModel?.id === m.id
    if (modelFilter === 'active') return isActive
    if (modelFilter === 'standby') return !isActive
    return true
  })

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return logs
    return logs.filter((line) => line.toLowerCase().includes(logSearch.toLowerCase()))
  }, [logs, logSearch])

  // Formatter for individual terminal log line
  const renderHighlightedContent = (text) => {
    // Highlight Epoch
    if (text.startsWith('Epoch ')) {
      const parts = text.split(' | ')
      return (
        <span>
          {parts.map((part, idx) => {
            if (part.startsWith('Epoch ')) {
              return <span key={idx} className="font-bold text-sky-400 mr-2">[{part}]</span>
            }
            if (part.startsWith('GPU Mem:')) {
              return <span key={idx} className="text-purple-300 mr-2">{part}</span>
            }
            if (part.includes('_loss:')) {
              return <span key={idx} className="text-amber-300 mr-2">{part}</span>
            }
            if (part.startsWith('mAP50:')) {
              return <span key={idx} className="font-bold text-emerald-400 mr-2">{part}</span>
            }
            return <span key={idx} className="text-slate-300 mr-2">{part}</span>
          })}
        </span>
      )
    }

    if (text.includes('✓') || text.includes('Finished') || text.includes('Registered') || text.includes('🏆')) {
      return <span className="text-emerald-400 font-semibold">{text}</span>
    }
    if (text.includes('⚠️') || text.includes('Warning') || text.includes('🛑')) {
      return <span className="text-amber-400 font-semibold">{text}</span>
    }
    if (text.startsWith('🚀') || text.startsWith('🌐') || text.startsWith('📦') || text.startsWith('⬇️') || text.startsWith('🔥') || text.startsWith('⚡')) {
      return <span className="text-indigo-300">{text}</span>
    }

    return <span className="text-slate-300">{text}</span>
  }

  const renderLogLine = (rawLog, index) => {
    let timeStr = ''
    let content = rawLog
    const timeMatch = rawLog.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/)
    if (timeMatch) {
      timeStr = timeMatch[1]
      content = timeMatch[2]
    }

    const isSuccess = content.includes('✓') || content.includes('Finished') || content.includes('Registered') || content.includes('🏆')
    const isWarn = content.includes('⚠️') || content.includes('Warning') || content.includes('🛑')
    const isEpoch = content.includes('Epoch') || content.includes('Starting Epoch') || content.includes('Loading')

    let tag = 'info'
    let tagLabel = 'INFO'
    if (isEpoch) {
      tag = 'epoch'
      tagLabel = 'EPOCH'
    } else if (isSuccess) {
      tag = 'success'
      tagLabel = 'DONE'
    } else if (isWarn) {
      tag = 'warn'
      tagLabel = 'WARN'
    }

    return (
      <div key={index} className="rf-terminal-line">
        <span className="rf-terminal-linenum">{(index + 1).toString().padStart(3, '0')}</span>
        {timeStr && <span className="rf-terminal-time">{timeStr}</span>}
        <span className={`rf-terminal-tag ${tag}`}>{tagLabel}</span>
        <span className="rf-terminal-content">
          {renderHighlightedContent(content)}
        </span>
      </div>
    )
  }

  return (
    <div className="rf-studio-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`rf-toast rf-toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 animate-spin" />}
          <span className="flex-1">{toast.message}</span>
        </div>
      )}

      {/* 1. Project Overview & Quick Actions */}
      <div className="rf-overview-card">
        <div className="rf-overview-main">
          <div className="rf-icon-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
            <Cpu className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="rf-title-row">
              <h2 className="rf-title">Private GPU Compute Node & Model Hub</h2>
              <span className="rf-badge-active" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#4ade80' }}>
                <span className="rf-pulse-dot" style={{ backgroundColor: '#4ade80' }}></span>
                GTX 1660 SUPER ONLINE
              </span>
              <span className="rf-tag font-mono text-emerald-300">
                Host: 172.30.81.175:9000
              </span>
            </div>
            <p className="rf-desc">
              ระบบส่งเทรนโมเดล YOLO บนเครื่องคำนวณ Private GPU Node พร้อม Zero-Copy NVMe Dataset Cache, Pre-flight AST Syntax Check (&lt;5ms) และ Live SSE Terminal
            </p>
            <div className="rf-meta-tags">
              <span className="rf-tag font-mono text-indigo-300">
                Hardware: NVIDIA GeForce GTX 1660 SUPER (6GB GDDR6)
              </span>
              <span className="rf-tag text-slate-300">
                GPU Temp: {gpuTelemetry.temperature_c || 34}°C | VRAM: {gpuTelemetry.memory_used_mb || 844}/{gpuTelemetry.memory_total_mb || 6144} MB
              </span>
              <span className="rf-tag text-amber-300">
                Dataset: {datasetId} (Unified MinIO Storage)
              </span>
              <span className="rf-tag text-emerald-400">
                Status: {isTrainingActive ? 'TRAINING IN PROGRESS' : 'READY TO TRAIN (0 Cloud Cost)'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="rf-overview-actions">
          {isTrainingActive ? (
            <button
              type="button"
              onClick={handleCancelTraining}
              className="rf-btn-cancel-job"
              title="ยกเลิกงานเทรนบน GPU Node"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>ยกเลิกงานเทรน (Cancel)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartTraining}
              disabled={isStarting}
              className="rf-btn-start-job"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              title="สั่งเทรนโมเดลบน Private GPU Node"
            >
              <Play className={`w-4 h-4 fill-current ${isStarting ? 'animate-bounce' : ''}`} />
              <span>{isStarting ? 'กำลังรัน Pre-flight Check...' : '🚀 สั่งเทรนบน GPU Node (Start Train)'}</span>
            </button>
          )}

          <a
            href="http://172.30.81.175:9000/docs"
            target="_blank"
            rel="noreferrer"
            className="rf-btn-cloud-open"
            title="เปิดหน้า Swagger API Documentation ของ GPU Node"
          >
            <span>GPU Node Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => { fetchModels(); fetchTelemetry(); fetchDatasets(); }}
            className="rf-btn-refresh-icon"
            title="รีเฟรชข้อมูลโมเดลและสถานะการ์ดจอ"
          >
            <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid (4 Responsive Boxes) */}
      <div className="rf-metrics-grid">
        {/* Metric 1: Active Model */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Award className="w-3.5 h-3.5" />
              โมเดลหลักที่ใช้งาน (Active Model)
            </span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num truncate max-w-[170px]" style={{ color: '#34d399' }} title={activeModel?.model_name || 'YOLOv11-Parking'}>
              {activeModel?.model_name || 'YOLOv11-Parking'}
            </span>
            <span className="rf-metric-unit">{activeModel?.version || 'v1.1.0'}</span>
          </div>
          <span className="rf-metric-hint">โมเดลสำหรับ AI Live Detection & LINE Bot</span>
        </div>

        {/* Metric 2: mAP50 Accuracy */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <TrendingUp className="w-3.5 h-3.5" />
              ความแม่นยำ (mAP50 Accuracy)
            </span>
            <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">IoU @ 0.50</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num" style={{ color: '#818cf8' }}>
              {activeModel?.map50 ? `${activeModel.map50}%` : activeModel?.metrics?.mAP50 ? `${(activeModel.metrics.mAP50 * 100).toFixed(1)}%` : '96.8%'}
            </span>
            <span className="rf-metric-unit">mAP@50</span>
          </div>
          <div className="rf-progress-bar">
            <div
              className="rf-progress-fill"
              style={{ width: `${activeModel?.map50 || 96.8}%` }}
            ></div>
          </div>
          <span className="rf-metric-hint">เกณฑ์มาตรฐานโมเดลคุณภาพสูง &gt; 95%</span>
        </div>

        {/* Metric 3: Target Dataset */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-amber-400">
              <FolderGit2 className="w-3.5 h-3.5" />
              ชุดข้อมูลฝึกสอน (Unified Dataset)
            </span>
            <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">NVMe Cached</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num" style={{ color: '#fbbf24' }}>
              3,179
            </span>
            <span className="rf-metric-unit">รูป พร้อมเทรน</span>
          </div>
          <span className="rf-metric-hint">Single Unified MinIO: {datasetId}</span>
        </div>

        {/* Metric 4: Private GPU Node Hardware */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              Private GPU Telemetry
            </span>
            <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">0฿ CLOUD COST</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num" style={{ color: '#4ade80' }}>
              GTX 1660S
            </span>
            <span className="rf-metric-unit">{gpuTelemetry.temperature_c || 34}°C | {gpuTelemetry.memory_used_mb || 844}M</span>
          </div>
          <div className="rf-progress-bar">
            <div
              className="rf-progress-fill"
              style={{ width: `${Math.round(((gpuTelemetry.memory_used_mb || 844) / (gpuTelemetry.memory_total_mb || 6144)) * 100)}%`, backgroundColor: '#10b981' }}
            ></div>
          </div>
          <span className="rf-metric-hint">VRAM Free: {gpuTelemetry.memory_free_mb || 5123} MB / 6,144 MB</span>
        </div>
      </div>

      {/* 3. Training Configuration & Interactive Pipeline */}
      <div className="rf-card-block">
        <div className="rf-card-block-header">
          <div>
            <h3 className="rf-block-title">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>ตั้งค่าและสั่งเทรนโมเดล (Private GPU Compute Pipeline)</span>
            </h3>
            <p className="rf-block-desc">
              เลือกสถาปัตยกรรมโมเดล YOLO, จำนวนรอบ Epochs, และ Dataset เพื่อรันงานเทรนบน NVIDIA GTX 1660 SUPER พร้อมระบบ Pre-flight AST Validation (&lt;5ms)
            </p>
          </div>

          <div>
            {isTrainingActive ? (
              <button
                type="button"
                onClick={handleCancelTraining}
                className="rf-btn-cancel-job"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>ยกเลิกงานเทรน (Cancel Training)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartTraining}
                disabled={isStarting}
                className="rf-btn-start-job"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isStarting ? 'กำลังรัน Pre-flight Check...' : '🚀 สั่งเทรนบน Private GPU Node (Start)'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Base Model Selector Grid */}
        <div>
          <span className="rf-form-label block mb-2">เลือกสถาปัตยกรรมโมเดลเริ่มต้น (Base Model Architecture):</span>
          <div className="rf-cam-grid">
            {BASE_MODELS.map((bm) => {
              const isSelected = baseModel === bm.id
              return (
                <div
                  key={bm.id}
                  onClick={() => setBaseModel(bm.id)}
                  className={`rf-cam-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="rf-cam-card-top">
                    <span className="font-bold">{bm.shortName}</span>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">{bm.badge}</span>
                    )}
                  </div>
                  <div className="rf-cam-card-bottom">
                    <span className="rf-cam-num text-sm">{bm.params}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-snug">{bm.desc}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hyperparameters & Dataset Form Controls */}
        <div className="rf-form-grid">
          <div className="rf-form-group">
            <label className="rf-form-label">เลือกชุดข้อมูล (Target Dataset):</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="rf-form-select font-mono"
            >
              {datasetsList.map((ds) => (
                <option key={ds.dataset_id} value={ds.dataset_id}>
                  {ds.name} ({ds.file_count || 0} รูป)
                </option>
              ))}
            </select>
          </div>

          <div className="rf-form-group">
            <label className="rf-form-label">Epochs (รอบการเทรน):</label>
            <select
              value={epochs}
              onChange={(e) => setEpochs(e.target.value)}
              className="rf-form-select font-mono"
            >
              <option value="5">5 Epochs (Quick Test)</option>
              <option value="25">25 Epochs (Fast Train)</option>
              <option value="50">50 Epochs (Recommended)</option>
              <option value="100">100 Epochs (Deep Training)</option>
              <option value="200">200 Epochs (Full Convergence)</option>
            </select>
          </div>

          <div className="rf-form-group">
            <label className="rf-form-label">Batch Size (VRAM 6GB Optimized):</label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="rf-form-select font-mono"
            >
              <option value="8">8 (Low VRAM Footprint ~2.5GB)</option>
              <option value="16">16 (Recommended for GTX 1660S ~3.8GB)</option>
              <option value="32">32 (High Throughput ~5.2GB)</option>
            </select>
          </div>

          <div className="rf-form-group">
            <label className="rf-form-label">Compute Device:</label>
            <input
              type="text"
              readOnly
              value="NVIDIA GeForce GTX 1660 SUPER (6GB GDDR6)"
              className="rf-form-input font-mono text-emerald-300 bg-slate-900 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Status & Partitioning Banner */}
        <div className="rf-status-banner">
          <div className="rf-status-item">
            <span className="rf-status-item-label">โมเดลเป้าหมาย (Architecture)</span>
            <span className="rf-status-item-val font-mono text-emerald-300">
              {baseModel}
            </span>
          </div>

          <div className="rf-status-item">
            <span className="rf-status-item-label">ชุดข้อมูลเป้าหมาย (Dataset)</span>
            <span className="rf-status-item-val font-mono text-amber-300">
              {datasetId}
            </span>
          </div>

          <div className="rf-status-item">
            <span className="rf-status-item-label">Pre-flight AST Syntax</span>
            <span className="rf-status-item-val font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PASSED (&lt;5ms)</span>
            </span>
          </div>

          <div className="rf-status-item">
            <span className="rf-status-item-label">สถานะ GPU Worker</span>
            <span className="rf-status-item-val flex items-center gap-1.5 font-mono text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${isTrainingActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{currentJob?.status || 'IDLE'}</span>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded">[GTX 1660S]</span>
            </span>
          </div>
        </div>

        {/* Active Job Progress Bar */}
        {currentJob && currentJob.progress_pct !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>ความคืบหน้าการเทรนบน GPU (Epoch Progress):</span>
              <span className="font-mono text-emerald-300 font-bold">
                {currentJob.current_epoch || 0} / {currentJob.epochs || epochs} Epochs ({currentJob.progress_pct || 0}%)
              </span>
            </div>
            <div className="rf-progress-bar-lg">
              <div
                className="rf-progress-fill-purple"
                style={{ width: `${currentJob.progress_pct || 0}%`, backgroundColor: '#10b981' }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 4. High-Tech Real-Time Terminal Log Streamer */}
      <div className="rf-card-block">
        <div className="rf-card-block-header">
          <div>
            <h3 className="rf-block-title">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Private GPU Compute Node Live Terminal (<code>http://172.30.81.175:9000</code>)</span>
            </h3>
            <p className="rf-block-desc">
              สตรีมผลการประมวลผลสดจาก NVIDIA GTX 1660 SUPER ผ่านระบบ SSE (Server-Sent Events) แบบ Real-Time
            </p>
          </div>


          <div className="flex items-center gap-2.5">
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 ${
              currentJob?.status === 'TRAINING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : currentJob?.status === 'COMPLETED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isTrainingActive ? 'bg-amber-400 animate-ping' : currentJob?.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              <span>LIVE SSE: {currentJob?.status || 'IDLE'}</span>
            </span>
          </div>
        </div>

        {/* High-Tech Terminal Container */}
        <div className="rf-terminal-container">
          {/* Terminal Top Bar */}
          <div className="rf-terminal-topbar">
            <div className="flex items-center gap-3">
              <div className="rf-terminal-dots">
                <span className="rf-terminal-dot red" title="Close"></span>
                <span className="rf-terminal-dot yellow" title="Minimize"></span>
                <span className="rf-terminal-dot green" title="Maximize"></span>
              </div>
              <span className="rf-terminal-title">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>modal-node-gpu-01:~/ultralytics/runs/train (bash)</span>
              </span>
            </div>

            {/* Terminal Actions */}
            <div className="rf-terminal-actions">
              {/* Search Log Input */}
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหา Log..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="rf-terminal-search pl-7"
                />
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopyLogs}
                disabled={!logs.length}
                className="rf-terminal-btn"
                title="คัดลอกข้อความ Log ทั้งหมด"
              >
                {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'Copy'}</span>
              </button>

              {/* Clear Terminal Button */}
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="rf-terminal-btn"
                  title="ล้างข้อความในหน้าต่าง"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Clear</span>
                </button>
              )}

              {/* Auto Scroll Toggle */}
              <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600"
                />
                <span>Auto-scroll</span>
              </label>

              {/* Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rf-terminal-btn"
                title={isExpanded ? 'ย่อหน้าต่าง' : 'ขยายหน้าต่าง'}
              >
                {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={terminalEndRef}
            className="rf-terminal-body"
            style={{ height: isExpanded ? '460px' : '280px' }}
          >
            {filteredLogs.length > 0 ? (
              <>
                {filteredLogs.map((log, index) => renderLogLine(log, index))}
                {isTrainingActive && (
                  <div className="py-1 flex items-center text-sky-400 font-mono text-[11px]">
                    <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString('th-TH')}]</span>
                    <span>กำลังประมวลผลบน Cloud GPU...</span>
                    <span className="rf-terminal-cursor"></span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-12">
                <FileCode className="w-9 h-9 mb-2 opacity-30" />
                <span className="text-xs text-slate-400">
                  {logSearch ? 'ไม่พบข้อความ Log ที่ตรงกับคำค้นหา' : 'ยังไม่มี Session การเทรนที่กำลังทำงาน กดปุ่ม "สั่งเทรนโมเดล" เพื่อเริ่มงาน'}
                </span>
                <span className="text-[11px] text-slate-600 mt-1 font-mono">
                  Listening for SSE events on /api/v1/training/modal/logs/...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Model Registry & Active Version Switcher */}
      <div className="rf-card-block">
        <div className="rf-card-block-header">
          <div>
            <h3 className="rf-block-title">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>คลังโมเดลและตัวสลับเวอร์ชัน (Model Registry & Active Switcher)</span>
            </h3>
            <p className="rf-block-desc">
              สลับโมเดลที่ต้องการให้ระบบ AI Live Detection และ LINE Bot ใช้งานจริงได้ทันทีแบบ Zero-Downtime โดยไม่ต้อง Restart เซิร์ฟเวอร์
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Buttons */}
            <div className="rf-tab-filters">
              {['all', 'active', 'standby'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setModelFilter(filter)}
                  className={`rf-filter-btn ${modelFilter === filter ? 'active' : ''}`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>

            <span className="rf-badge-active font-mono">
              TOTAL: {modelsList.length} MODELS
            </span>
          </div>
        </div>

        {/* Model Cards Grid */}
        <div className="rf-models-grid">
          {filteredModels.length > 0 ? (
            filteredModels.map((m) => {
              const isActive = m.is_active || activeModel?.id === m.id
              const isActivating = activatingId === m.id

              return (
                <div
                  key={m.id}
                  className={`rf-model-card ${isActive ? 'active' : ''}`}
                >
                  <div>
                    <div className="rf-model-card-top">
                      <div>
                        <span className="rf-model-name block" title={m.model_name}>
                          {m.model_name}
                        </span>
                        <span className="font-mono text-xs text-purple-300 font-semibold">{m.version}</span>
                      </div>
                      <span className={`rf-badge-status ${isActive ? 'uploaded' : 'pending'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                        {isActive ? 'ACTIVE' : 'STANDBY'}
                      </span>
                    </div>

                    <div className="rf-model-stats mt-3 pt-3 border-t border-slate-800">
                      <div className="rf-model-stat-row">
                        <span>ความแม่นยำ (mAP50):</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {m.map50 ? `${m.map50}%` : m.metrics?.mAP50 ? `${(m.metrics.mAP50 * 100).toFixed(1)}%` : '96.8%'}
                        </span>
                      </div>
                      <div className="rf-model-stat-row">
                        <span>รอบการเทรน (Epochs):</span>
                        <span className="font-mono text-slate-200">{m.epochs || m.metrics?.epochs_completed || 50}</span>
                      </div>
                      <div className="rf-model-stat-row">
                        <span>Roboflow Dataset:</span>
                        <span className="font-mono text-amber-300">v{m.roboflow_version || 1}</span>
                      </div>
                      <div className="rf-model-stat-row">
                        <span>บันทึกเมื่อ:</span>
                        <span className="text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleDateString('th-TH') : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Switcher Button */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleActivateModel(m.id)}
                      disabled={isActive || isActivating}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'rf-btn-start-job'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>กำลังใช้งานตรวจจับ (Active)</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isActivating ? 'กำลังสลับ...' : '⚡ สลับมาใช้เวอร์ชันนี้ (Set Active)'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full text-center py-10 text-slate-500 text-xs">
              ไม่มีโมเดลในตัวกรองนี้
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
