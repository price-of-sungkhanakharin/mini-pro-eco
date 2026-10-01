import React, { useState, useEffect, useRef } from 'react'
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
  ChevronRight,
  TrendingUp,
  Award,
  Check,
  Sliders,
  Radio,
  FileCode,
  HardDrive
} from 'lucide-react'

export default function AutoTrainerStudio({ apiBase }) {
  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  // Training Config State
  const [baseModel, setBaseModel] = useState('yolo11n.pt')
  const [roboflowVersion, setRoboflowVersion] = useState(1)
  const [epochs, setEpochs] = useState(50)
  const [batchSize, setBatchSize] = useState(16)
  const [imgsz, setImgsz] = useState(640)
  const [gpuType, setGpuType] = useState('T4')

  // Job & Logs State
  const [currentJob, setCurrentJob] = useState(null)
  const [logs, setLogs] = useState([])
  const [isStarting, setIsStarting] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Model Registry State
  const [modelsList, setModelsList] = useState([])
  const [activeModel, setActiveModel] = useState(null)
  const [loadingModels, setLoadingModels] = useState(false)
  const [activatingId, setActivatingId] = useState(null)
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

  // Poll active training job status
  const fetchActiveJob = async () => {
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/training/modal/active`)
      if (res.ok) {
        const data = await res.json()
        if (data.job) {
          setCurrentJob(data.job)
          if (Array.isArray(data.job.recent_logs) && data.job.recent_logs.length > 0) {
            setLogs(data.job.recent_logs)
          }
        }
      }
    } catch (err) {
      // Fallback silently
    }
  }

  useEffect(() => {
    fetchModels()
    fetchActiveJob()
    const pollInterval = setInterval(() => {
      fetchActiveJob()
    }, 3000)
    return () => clearInterval(pollInterval)
  }, [effectiveApiBase])

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Handle Model Activation / Switch
  const handleActivateModel = async (modelId) => {
    setActivatingId(modelId)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/models/${modelId}/activate`, {
        method: 'POST'
      })
      if (res.ok) {
        const updated = await res.json()
        showToast(`✓ สลับใช้งานโมเดล ${updated.model_name} (${updated.version}) เป็นโมเดลหลักเรียบร้อยแล้ว!`, 'success', 5000)
        await fetchModels()
      } else {
        showToast('✗ สลับโมเดลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error')
      }
    } catch (err) {
      showToast('✗ ไม่สามารถเชื่อมต่อ API ได้', 'error')
    } finally {
      setActivatingId(null)
    }
  }

  // Handle Start Training on Modal
  const handleStartTraining = async () => {
    setIsStarting(true)
    showToast(`🚀 กำลังส่งคำสั่งเทรนโมเดล ${baseModel} บน Modal Serverless GPU (${gpuType})...`, 'info', 6000)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/training/modal/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_model: baseModel,
          epochs: parseInt(epochs, 10),
          batch_size: parseInt(batchSize, 10),
          imgsz: parseInt(imgsz, 10),
          roboflow_version: parseInt(roboflowVersion, 10),
          gpu_type: gpuType
        })
      })

      if (res.ok) {
        const data = await res.json()
        showToast('✓ เริ่มงานเทรนบน Modal เรียบร้อยแล้ว! กำลัง Stream Log...', 'success', 6000)
        setLogs([`[00:00:00] 🚀 Enqueued training job: ${data.job_id}...`])
        await fetchActiveJob()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`✗ ส่งคำสั่งไม่สำเร็จ: ${err.detail || 'เกิดข้อผิดพลาด'}`, 'error')
      }
    } catch (err) {
      showToast('✗ ไม่สามารถเชื่อมต่อ API Server ได้', 'error')
    } finally {
      setIsStarting(false)
    }
  }

  // Handle Cancel Training
  const handleCancelTraining = async () => {
    if (!currentJob) return
    try {
      await fetch(`${effectiveApiBase}/api/v1/training/modal/cancel/${currentJob.job_id}`, {
        method: 'POST'
      })
      showToast('ยกเลิกงานเทรนเรียบร้อยแล้ว', 'info')
      await fetchActiveJob()
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  const isTrainingActive = currentJob && ['INITIALIZING', 'DOWNLOADING_DATASET', 'TRAINING'].includes(currentJob.status)

  return (
    <div className="setup-view-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
          }`}
          style={{ minWidth: '320px', maxWidth: '480px' }}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 animate-spin" />}
          <span className="text-xs font-medium leading-relaxed flex-1">{toast.message}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3.5">
          <div className="setup-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
            <Cpu className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide">
                Modal Cloud GPU Auto-Trainer & Model Hub
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Roboflow Dataset (cctv-parking)
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                MODAL SERVERLESS READY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ระบบส่งเทรนโมเดล YOLO อัตโนมัติบน Modal Cloud GPU พร้อม Live Terminal Logs และระบบสลับเวอร์ชันโมเดลตรวจจับ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchModels}
            className="btn-platform btn-platform-dark p-2"
            title="รีเฟรชข้อมูลโมเดล"
          >
            <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Active Model */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-emerald-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              ACTIVE MODEL (โมเดลหลัก)
            </span>
            <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">ONLINE</span>
          </div>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-white tracking-tight block truncate" title={activeModel?.model_name || 'YOLOv11-Parking'}>
              {activeModel?.model_name || 'YOLOv11-Parking'}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">{activeModel?.version || 'v1.1.0'}</span>
          </div>
        </div>

        {/* Card 2: mAP50 Accuracy */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-indigo-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              ACCURACY (mAP50)
            </span>
            <span className="font-mono text-[10px] text-slate-400">IoU @ 0.50</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-indigo-400">
              {activeModel?.map50 ? `${activeModel.map50}%` : '96.8%'}
            </span>
            <span className="text-xs text-slate-400">ความแม่นยำ</span>
          </div>
        </div>

        {/* Card 3: Roboflow Dataset Source */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-300 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5" />
              ROBOFLOW DATASET
            </span>
            <span className="font-mono text-[10px] text-amber-400">v{roboflowVersion}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">
              3,179
            </span>
            <span className="text-xs text-slate-400">รูปภาพพร้อมเทรน</span>
          </div>
        </div>

        {/* Card 4: Cloud Compute Engine */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-purple-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              MODAL SERVERLESS GPU
            </span>
            <span className="font-mono text-[10px] text-purple-400">Cloud GPU</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-purple-300">
              NVIDIA {gpuType}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Training Config & Terminal Grid Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Settings Panel (5 Columns) */}
        <div className="lg:col-span-5 setup-content-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white">ตั้งค่าการเทรน (Training Configuration)</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Dataset Version */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Roboflow Dataset Version:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={roboflowVersion}
                    onChange={(e) => setRoboflowVersion(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">project: cctv-parking</span>
                </div>
              </div>

              {/* Base Model Architecture */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Base Model Architecture:
                </label>
                <select
                  value={baseModel}
                  onChange={(e) => setBaseModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="yolo11n.pt">YOLOv11 Nano (yolo11n.pt) - แนะนำ: เร็วสุด 2.6M params</option>
                  <option value="yolo11s.pt">YOLOv11 Small (yolo11s.pt) - ความแม่นยำสูง 9.4M params</option>
                  <option value="yolov8n.pt">YOLOv8 Nano (yolov8n.pt) - Stable 3.2M params</option>
                  <option value="yolov8s.pt">YOLOv8 Small (yolov8s.pt) - Standard 11.2M params</option>
                </select>
              </div>

              {/* Epochs & Batch Size Row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Epochs (รอบเทรน):</label>
                  <select
                    value={epochs}
                    onChange={(e) => setEpochs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="5">5 Epochs (Quick Test)</option>
                    <option value="25">25 Epochs (Fast)</option>
                    <option value="50">50 Epochs (Recommended)</option>
                    <option value="100">100 Epochs (Deep Train)</option>
                    <option value="200">200 Epochs (Full Convergence)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Batch Size:</label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="8">8 (Low Memory)</option>
                    <option value="16">16 (Standard)</option>
                    <option value="32">32 (High Throughput)</option>
                  </select>
                </div>
              </div>

              {/* Cloud GPU Selection */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Modal Serverless GPU:</label>
                <select
                  value={gpuType}
                  onChange={(e) => setGpuType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="T4">NVIDIA T4 16GB (คุ้มค่า & เร็วพอดี)</option>
                  <option value="A10G">NVIDIA A10G 24GB (ความเร็วสูงพิเศษ)</option>
                  <option value="L4">NVIDIA L4 24GB (Ada Lovelace Tensor Core)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            {isTrainingActive ? (
              <button
                type="button"
                onClick={handleCancelTraining}
                className="w-full btn-platform btn-platform-rose py-2.5 justify-center"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>ยกเลิกงานเทรน (Cancel Training)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartTraining}
                disabled={isStarting}
                className="w-full btn-platform btn-platform-purple py-2.5 justify-center shadow-lg shadow-purple-500/25"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isStarting ? 'กำลังส่งงานขึ้น Modal...' : '🚀 สั่งเทรนบน Modal Cloud GPU (Start)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Cyberpunk Terminal Log Viewer (7 Columns) */}
        <div className="lg:col-span-7 setup-content-card flex flex-col justify-between" style={{ background: '#080d19' }}>
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">
                  modal_gpu_stdout: /root/logs/train.log
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  currentJob?.status === 'TRAINING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    : currentJob?.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  STATUS: {currentJob?.status || 'IDLE'}
                </span>

                <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-purple-600"
                  />
                  <span>Auto-scroll</span>
                </label>
              </div>
            </div>

            {/* Terminal Screen */}
            <div
              ref={terminalEndRef}
              className="bg-black/90 rounded-xl p-3 font-mono text-[11px] leading-relaxed text-slate-300 overflow-y-auto border border-slate-800"
              style={{ height: '260px' }}
            >
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  const isSuccess = log.includes('✓') || log.includes('Finished') || log.includes('Registered')
                  const isWarning = log.includes('⚠️')
                  const isEpoch = log.includes('Epoch')
                  return (
                    <div
                      key={index}
                      className={`whitespace-pre-wrap ${
                        isSuccess
                          ? 'text-emerald-400'
                          : isWarning
                          ? 'text-amber-400'
                          : isEpoch
                          ? 'text-sky-300 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      {log}
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <FileCode className="w-6 h-6 mb-1 opacity-40" />
                  <span>ยังไม่มีงานเทรนที่กำลังทำงาน กดปุ่ม 'สั่งเทรนบน Modal' เพื่อเริ่มงาน</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar under Terminal */}
          {currentJob && (
            <div className="mt-3 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>ความคืบหน้าการเทรน (Epoch Progress):</span>
                <span className="font-mono text-purple-300 font-bold">
                  {currentJob.current_epoch} / {currentJob.epochs} Epochs ({currentJob.progress_pct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-purple-500/30">
                <div
                  className="bg-gradient-to-r from-purple-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentJob.progress_pct}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Model Registry & Active Version Switcher */}
      <div className="setup-content-card">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="section-title-sm">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Model Registry & Active Version Switcher (คลังโมเดลและตัวสลับเวอร์ชัน)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              เลือกสลับโมเดลที่ต้องการให้ระบบ AI Detection ใช้งานจริงได้ทันที โดยไม่ต้อง Restart เซิร์ฟเวอร์
            </p>
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            TOTAL REGISTERED: {modelsList.length} MODELS
          </span>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3.5">
          {modelsList.map((m) => {
            const isActive = m.is_active || activeModel?.id === m.id
            const isActivating = activatingId === m.id

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-xl shadow-emerald-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-sm text-white truncate" title={m.model_name}>
                      {m.model_name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isActive && <Check className="w-3 h-3 text-emerald-400" />}
                      {isActive ? 'CURRENT ACTIVE' : 'STANDBY'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Version:</span>
                      <span className="font-mono text-purple-300 font-bold">{m.version}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Accuracy (mAP50):</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {m.map50 ? `${m.map50}%` : m.metrics?.mAP50 ? `${(m.metrics.mAP50 * 100).toFixed(1)}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Epochs:</span>
                      <span className="font-mono text-slate-300">{m.epochs || m.metrics?.epochs_completed || 50}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Roboflow Dataset:</span>
                      <span className="font-mono text-amber-300">v{m.roboflow_version || 1}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>บันทึกเมื่อ:</span>
                      <span className="text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleDateString('th-TH') : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Switcher Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleActivateModel(m.id)}
                    disabled={isActive || isActivating}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>กำลังใช้งานโมเดลนี้ (Active)</span>
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
          })}
        </div>
      </div>
    </div>
  )
}
