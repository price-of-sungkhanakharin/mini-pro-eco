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
  SlidersHorizontal,
  TrendingUp,
  Award,
  Check,
  FileCode,
  Code2,
  Upload,
  RotateCcw,
  Copy,
  CheckCheck,
  Maximize2,
  Minimize2,
  Search,
  Trash2
} from 'lucide-react'

const BASE_MODELS = [
  {
    id: 'yolo26m.pt',
    name: 'YOLO26 Medium (yolo26m.pt)',
    shortName: 'yolo26m',
    params: '25.9M params',
    desc: 'โมเดลตั้งต้นหลัก (Base Pretrained Model) สำหรับตรวจจับรถยนต์และมอเตอร์ไซค์',
    badge: 'BASE MODEL'
  },
  {
    id: 'best.pt',
    name: 'YOLO26 Best (best.pt)',
    shortName: 'best',
    params: '25.9M params',
    desc: 'โมเดลที่ผ่านการ Finetuned ล่าสุด (Active Production) พร้อม Cross-class NMS',
    badge: 'RECOMMENDED'
  }
]

export default function AutoTrainerPage({ apiBase }) {
  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  // Training Mode State: 'easy' | 'advanced'
  const [trainingMode, setTrainingMode] = useState('easy')

  // Training Config State (Common)
  const [baseModel, setBaseModel] = useState('yolo26m.pt')
  const [datasetId, setDatasetId] = useState('ds_cctv_parking_labeled')
  const [datasetsList, setDatasetsList] = useState([
    { dataset_id: 'ds_cctv_parking_labeled', name: 'CCTV Parking (152 Labeled Images)', file_count: 152, size_mb: 30.7 },
    { dataset_id: 'ds_cctv_parking_v1', name: 'CCTV Parking Main Gate (152 Images)', file_count: 152, size_mb: 30.7 },
    { dataset_id: 'ds_dogcat_v1', name: 'Dog Cat Small (Demo Dataset)', file_count: 4, size_mb: 0.1 }
  ])
  const [roboflowVersion, setRoboflowVersion] = useState(1)
  const [epochs, setEpochs] = useState(50)
  const [batchSize, setBatchSize] = useState(16)
  const [imgsz, setImgsz] = useState(640)
  const [gpuType, setGpuType] = useState('GTX 1660 SUPER (6GB)')

  // Easy Mode Hyperparameters & Augmentations
  const [lr0, setLr0] = useState(0.01)
  const [optimizer, setOptimizer] = useState('auto')
  const [patience, setPatience] = useState(20)
  const [mosaic, setMosaic] = useState(1.0)
  const [mixup, setMixup] = useState(0.15)
  const [fliplr, setFliplr] = useState(0.5)
  const [hsvV, setHsvV] = useState(0.4)
  const [scale, setScale] = useState(0.3)
  const [erasing, setErasing] = useState(0.4)
  const [degrees, setDegrees] = useState(5.0)

  // Augmentation Preset State
  const [augmentPreset, setAugmentPreset] = useState('cctv')
  const [showCustomAugment, setShowCustomAugment] = useState(false)

  const handleApplyPreset = (presetKey) => {
    setAugmentPreset(presetKey)
    if (presetKey === 'cctv') {
      setMosaic(1.0)
      setMixup(0.15)
      setFliplr(0.5)
      setHsvV(0.4)
      setScale(0.3)
      setErasing(0.4)
      setDegrees(5.0)
      setShowCustomAugment(false)
    } else if (presetKey === 'light') {
      setMosaic(0.0)
      setMixup(0.0)
      setFliplr(0.5)
      setHsvV(0.2)
      setScale(0.1)
      setErasing(0.0)
      setDegrees(0.0)
      setShowCustomAugment(false)
    } else if (presetKey === 'heavy') {
      setMosaic(1.0)
      setMixup(0.3)
      setFliplr(0.5)
      setHsvV(0.6)
      setScale(0.4)
      setErasing(0.5)
      setDegrees(10.0)
      setShowCustomAugment(false)
    } else if (presetKey === 'off') {
      setMosaic(0.0)
      setMixup(0.0)
      setFliplr(0.0)
      setHsvV(0.0)
      setScale(0.0)
      setErasing(0.0)
      setDegrees(0.0)
      setShowCustomAugment(false)
    } else if (presetKey === 'custom') {
      setShowCustomAugment(true)
    }
  }

  // Advanced Mode State (Code Editor & Upload)
  const [editorCode, setEditorCode] = useState('')
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const fileInputRef = useRef(null)

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

  // Generate Code from UI settings
  const handleGenerateCode = async (showSuccessToast = true) => {
    setIsGeneratingCode(true)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/training/gpu/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_model: baseModel,
          epochs: Number(epochs),
          batch_size: Number(batchSize),
          imgsz: Number(imgsz),
          dataset_id: datasetId,
          lr0: Number(lr0),
          optimizer: optimizer,
          patience: Number(patience),
          mosaic: Number(mosaic),
          mixup: Number(mixup),
          fliplr: Number(fliplr),
          degrees: Number(degrees),
          hsv_v: Number(hsvV),
          scale: Number(scale),
          erasing: Number(erasing)
        })
      })
      if (res.ok) {
        const data = await res.json()
        setEditorCode(data.code)
        if (showSuccessToast) {
          showToast('⚡ สร้างสคริปต์ train.py จากการตั้งค่า UI เรียบร้อยแล้ว!', 'success', 3000)
        }
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเพื่อสร้างโค้ดได้', 'error')
    } finally {
      setIsGeneratingCode(false)
    }
  }

  // Auto-generate code when switching to advanced mode if editor is empty
  useEffect(() => {
    if (trainingMode === 'advanced' && !editorCode) {
      handleGenerateCode(false)
    }
  }, [trainingMode])

  // Handle file upload (.py / .txt)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result
      if (typeof content === 'string') {
        setEditorCode(content)
        showToast(`📁 โหลดไฟล์ ${file.name} เข้าสู่ Code Editor สำเร็จ!`, 'success')
      }
    }
    reader.readAsText(file)
  }

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
        gpu_type: 'GTX 1660 SUPER (6GB)',
        lr0: Number(lr0),
        optimizer: optimizer,
        patience: Number(patience),
        mosaic: Number(mosaic),
        mixup: Number(mixup),
        fliplr: Number(fliplr),
        degrees: Number(degrees),
        hsv_v: Number(hsvV),
        scale: Number(scale),
        erasing: Number(erasing),
        custom_code: trainingMode === 'advanced' && editorCode.trim() ? editorCode : null
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
        showToast(`✅ Pre-flight ผ่าน! ส่งงานเข้า GPU Task Queue สำเร็จ (${trainingMode === 'advanced' ? 'Advanced Code' : 'Easy Mode'})`, 'success')
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
              {datasetsList.find((d) => d.dataset_id === datasetId)?.file_count || 152}
            </span>
            <span className="rf-metric-unit">รูป (Labeled Pool)</span>
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
              เลือกระหว่างโหมดปรับค่าผ่าน UI หรือโหมดเขียน/แก้โค้ด Python (train.py) รันบน NVIDIA GTX 1660 SUPER
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
                  {isStarting ? 'กำลังรัน Pre-flight Check...' : `🚀 สั่งเทรนบน GPU Node (${trainingMode === 'advanced' ? 'Custom Code' : 'Start'})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Selector Tabs (Easy UI Mode vs Advanced Code Editor Mode) */}
        <div className="flex items-center gap-2 mb-4 p-1 rounded-lg bg-slate-900/80 border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setTrainingMode('easy')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              trainingMode === 'easy'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>โหมดง่าย (UI Parameter & Augmentation Controls)</span>
          </button>
          <button
            type="button"
            onClick={() => setTrainingMode('advanced')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              trainingMode === 'advanced'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>โหมดขั้นสูง (Python Code Editor & Script Upload)</span>
          </button>
        </div>

        {/* ─── MODE 1: EASY MODE (UI CONTROLS) ─── */}
        {trainingMode === 'easy' && (
          <div className="space-y-4">
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
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="rf-form-select font-mono"
                >
                  <option value={5}>5 Epochs (Quick Test)</option>
                  <option value={25}>25 Epochs (Fast Train)</option>
                  <option value={50}>50 Epochs (Recommended)</option>
                  <option value={100}>100 Epochs (Deep Training)</option>
                  <option value={200}>200 Epochs (Full Convergence)</option>
                </select>
              </div>

              <div className="rf-form-group">
                <label className="rf-form-label">Batch Size (VRAM 6GB Optimized):</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="rf-form-select font-mono"
                >
                  <option value={8}>8 (Low VRAM Footprint ~2.5GB)</option>
                  <option value={16}>16 (Recommended for GTX 1660S ~3.8GB)</option>
                  <option value={32}>32 (High Throughput ~5.2GB)</option>
                </select>
              </div>

              <div className="rf-form-group">
                <label className="rf-form-label">Learning Rate (lr0):</label>
                <select
                  value={lr0}
                  onChange={(e) => setLr0(Number(e.target.value))}
                  className="rf-form-select font-mono"
                >
                  <option value={0.01}>0.01 (Standard Default)</option>
                  <option value={0.005}>0.005 (Gentle Fine-Tune)</option>
                  <option value={0.001}>0.001 (Small Steps)</option>
                  <option value={0.0001}>0.0001 (Ultra-Fine Tuning)</option>
                </select>
              </div>

              <div className="rf-form-group">
                <label className="rf-form-label">Optimizer:</label>
                <select
                  value={optimizer}
                  onChange={(e) => setOptimizer(e.target.value)}
                  className="rf-form-select font-mono"
                >
                  <option value="auto">auto (Ultralytics Recommended)</option>
                  <option value="AdamW">AdamW (High Generalization)</option>
                  <option value="SGD">SGD (Classic Momentum)</option>
                  <option value="Adam">Adam (Adaptive Learning)</option>
                </select>
              </div>

              <div className="rf-form-group">
                <label className="rf-form-label">Early Stopping (Patience):</label>
                <select
                  value={patience}
                  onChange={(e) => setPatience(Number(e.target.value))}
                  className="rf-form-select font-mono"
                >
                  <option value={10}>10 Epochs (Fast Stop)</option>
                  <option value={20}>20 Epochs (Balanced)</option>
                  <option value={50}>50 Epochs (Patient)</option>
                  <option value={100}>100 Epochs (Full Exploration)</option>
                </select>
              </div>
            </div>

            {/* Minimal & Elegant Data Augmentation Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-xs text-slate-200">Data Augmentation (การสังเคราะห์ภาพ):</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">สูตร:</span>
                  {[
                    { key: 'cctv', label: '🌟 CCTV ลานจอด (แนะนำ)' },
                    { key: 'light', label: '🍃 แบบเบา' },
                    { key: 'heavy', label: '🔥 เข้มข้น' },
                    { key: 'off', label: '⛔ ปิด' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleApplyPreset(p.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        augmentPreset === p.key && !showCustomAugment
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                          : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAugmentPreset('custom')
                      setShowCustomAugment(!showCustomAugment)
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                      showCustomAugment || augmentPreset === 'custom'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{showCustomAugment ? 'ซ่อนตัวปรับ' : '⚙️ ปรับละเอียด'}</span>
                  </button>
                </div>
              </div>

              {/* Active Augmentation Summary Line (When not expanding custom sliders) */}
              {!showCustomAugment && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-950/40 px-3 py-2 rounded-lg border border-slate-800/50 font-mono">
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    {augmentPreset === 'cctv' && 'สูตร CCTV: ปรับแสงแดด/เงา/สลัว + รวม 4 ภาพจับรถซ้อนและระยะไกล'}
                    {augmentPreset === 'light' && 'สูตร Light: พลิกภาพซ้าย-ขวา + ปรับแสงเล็กน้อย'}
                    {augmentPreset === 'heavy' && 'สูตร Heavy: สังเคราะห์ภาพขั้นสุด ป้องกัน Overfitting'}
                    {augmentPreset === 'off' && 'ปิดการสังเคราะห์: ใช้เฉพาะภาพต้นฉบับ'}
                    {augmentPreset === 'custom' && 'ปรับแต่งค่า Augmentation เอง'}
                  </span>
                  {augmentPreset !== 'off' && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-emerald-300 border border-slate-800">Mosaic: {(mosaic * 100).toFixed(0)}%</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-emerald-300 border border-slate-800">MixUp: {(mixup * 100).toFixed(0)}%</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-emerald-300 border border-slate-800">Flip: {(fliplr * 100).toFixed(0)}%</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-amber-300 border border-slate-800">HSV Bright: {(hsvV * 100).toFixed(0)}%</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-indigo-300 border border-slate-800">Scale: &plusmn;{(scale * 100).toFixed(0)}%</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.5 rounded text-purple-300 border border-slate-800">Erasing: {(erasing * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Minimal Clean Sliders List (Only when 'ปรับละเอียด' is expanded) */}
              {showCustomAugment && (
                <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  {/* Mosaic */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-slate-300 font-medium block">Mosaic (รวม 4 ภาพ)</span>
                      <span className="text-[10px] text-slate-500">จับรถเล็ก/ซ้อนกัน</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={mosaic} onChange={(e) => { setMosaic(Number(e.target.value)); setAugmentPreset('custom') }}
                      className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-10 text-right font-mono text-emerald-400 font-bold">{(mosaic * 100).toFixed(0)}%</span>
                  </div>

                  {/* MixUp */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-slate-300 font-medium block">MixUp (ผสานภาพ)</span>
                      <span className="text-[10px] text-slate-500">ลด Overfitting</span>
                    </div>
                    <input
                      type="range" min="0" max="0.5" step="0.05"
                      value={mixup} onChange={(e) => { setMixup(Number(e.target.value)); setAugmentPreset('custom') }}
                      className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-10 text-right font-mono text-emerald-400 font-bold">{(mixup * 100).toFixed(0)}%</span>
                  </div>

                  {/* FlipLR */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-slate-300 font-medium block">Flip (พลิกซ้าย-ขวา)</span>
                      <span className="text-[10px] text-slate-500">ทิศทางรถเข้า-ออก</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.1"
                      value={fliplr} onChange={(e) => { setFliplr(Number(e.target.value)); setAugmentPreset('custom') }}
                      className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-10 text-right font-mono text-emerald-400 font-bold">{(fliplr * 100).toFixed(0)}%</span>
                  </div>

                  {/* HSV Brightness */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-slate-300 font-medium block">HSV แสงแดด/เงา</span>
                      <span className="text-[10px] text-slate-500">แดดจ้า/แสงสลัว/เงา</span>
                    </div>
                    <input
                      type="range" min="0" max="0.8" step="0.05"
                      value={hsvV} onChange={(e) => { setHsvV(Number(e.target.value)); setAugmentPreset('custom') }}
                      className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-10 text-right font-mono text-amber-400 font-bold">{(hsvV * 100).toFixed(0)}%</span>
                  </div>

                  {/* Scale */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-slate-300 font-medium block">Scale (ซูมภาพ)</span>
                      <span className="text-[10px] text-slate-500">ระยะรถใกล้-ไกล</span>
                    </div>
                    <input
                      type="range" min="0" max="0.5" step="0.05"
                      value={scale} onChange={(e) => { setScale(Number(e.target.value)); setAugmentPreset('custom') }}
                      className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-10 text-right font-mono text-indigo-400 font-bold">&plusmn;{(scale * 100).toFixed(0)}%</span>
                  </div>

                  {/* Erasing */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-slate-300 font-medium block">Erasing (สิ่งกีดขวาง)</span>
                      <span className="text-[10px] text-slate-500">จำลองเสา/ต้นไม้บัง</span>
                    </div>
                    <input
                      type="range" min="0" max="0.5" step="0.05"
                      value={erasing} onChange={(e) => { setErasing(Number(e.target.value)); setAugmentPreset('custom') }}
                      className="flex-1 accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-10 text-right font-mono text-purple-400 font-bold">{(erasing * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODE 2: ADVANCED CODE EDITOR & SCRIPT UPLOAD ─── */}
        {trainingMode === 'advanced' && (
          <div className="space-y-3">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-slate-200 font-semibold">train.py</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">Python 3.12 / Ultralytics</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleGenerateCode(true)}
                  disabled={isGeneratingCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition-all text-xs font-mono"
                  title="สร้างโค้ด train.py ใหม่ตามค่าพารามิเตอร์ที่เลือกในโหมดง่าย"
                >
                  <Sparkles className={`w-3 h-3 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingCode ? 'กำลังเจนโค้ด...' : '⚡ ซิงค์ค่าจาก UI (Regenerate)'}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".py,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-xs font-mono"
                  title="อัปโหลดไฟล์ train.py จากเครื่องของคุณ"
                >
                  <Upload className="w-3 h-3 text-sky-400" />
                  <span>📁 อัปโหลดไฟล์ .py</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editorCode)
                    showToast('📋 คัดลอกโค้ดสคริปต์เรียบร้อยแล้ว', 'info', 2500)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-xs font-mono"
                  title="คัดลอกโค้ดทั้งหมด"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* Code Editor Textarea */}
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#0d1117] font-mono text-xs">
              <textarea
                value={editorCode}
                onChange={(e) => setEditorCode(e.target.value)}
                rows={16}
                spellCheck={false}
                placeholder="# พิมพ์หรือแก้ไขโค้ด train.py สำหรับรันบนเซิร์ฟเวอร์ GPU ที่นี่..."
                className="w-full p-3.5 bg-transparent text-emerald-200 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                style={{ tabSize: 4 }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>💡 คุณสามารถแก้ไขไฮเปอร์พารามิเตอร์, เพิ่ม Callback, หรือแก้ฟังก์ชันเทรนได้ตามต้องการ</span>
              <span className="text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Pre-flight AST Syntax Checking Active
              </span>
            </div>
          </div>
        )}

        {/* Status & Partitioning Banner */}
        <div className="rf-status-banner mt-3.5">
          <div className="rf-status-item">
            <span className="rf-status-item-label">โหมดการสั่งงาน (Execution Mode)</span>
            <span className="rf-status-item-val font-mono text-indigo-300">
              {trainingMode === 'advanced' ? 'Advanced Code Editor' : 'Easy UI Hyperparameters'}
            </span>
          </div>

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
