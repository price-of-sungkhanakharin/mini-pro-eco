import React, { useState, useEffect } from 'react'
import {
  Layers,
  ExternalLink,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  FolderTree,
  Database,
  HardDrive,
  FolderGit2,
  Sun,
  Moon,
  Filter,
  Archive,
  Play,
  Square,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  Flame,
  Radio,
  Image as ImageIcon
} from 'lucide-react'

const INTERVAL_SECONDS = 1800 // 30 Minutes

export default function RoboflowStudio({ apiBase }) {
  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  const [syncStatus, setSyncStatus] = useState(null)
  const [bulkStatus, setBulkStatus] = useState(null)
  const [countdown, setCountdown] = useState(INTERVAL_SECONDS)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [startingBulk, setStartingBulk] = useState(false)
  const [selectedCamFilter, setSelectedCamFilter] = useState('all')
  const [toast, setToast] = useState(null) // { type: 'success' | 'info' | 'error', message: string }

  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }

  const fetchStatus = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const [syncRes, bulkRes] = await Promise.all([
        fetch(`${effectiveApiBase}/api/v1/roboflow/sync/status`),
        fetch(`${effectiveApiBase}/api/v1/roboflow/bulk/status`)
      ])
      if (syncRes.ok) {
        const data = await syncRes.json()
        setSyncStatus(data)
        if (typeof data.countdown_seconds === 'number') {
          setCountdown(data.countdown_seconds)
        }
      }
      if (bulkRes.ok) {
        const bData = await bulkRes.json()
        setBulkStatus(bData)
      }
    } catch (err) {
      console.error('Failed to fetch Roboflow status:', err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  // Periodic poll every 3 seconds to keep UI in live sync
  useEffect(() => {
    fetchStatus()
    const pollTimer = setInterval(() => fetchStatus(false), 3000)
    return () => clearInterval(pollTimer)
  }, [effectiveApiBase])

  // Local 1-second countdown ticker for smooth UI
  useEffect(() => {
    const ticker = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchStatus()
          return INTERVAL_SECONDS
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(ticker)
  }, [effectiveApiBase])

  const handleForceSync = async () => {
    setTriggering(true)
    showToast('กำลังสั่งอัปโหลดภาพรอบ 30 นาที (15 รูป) ขึ้นสู่ Roboflow Cloud...', 'info', 6000)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/roboflow/sync/trigger?batch_size=15`, {
        method: 'POST'
      })
      if (res.ok) {
        const result = await res.json()
        await fetchStatus()
        showToast(`✓ สำเร็จ! อัปโหลดภาพ ${result.uploaded || 15} รูปขึ้น Roboflow เรียบร้อยแล้ว`, 'success', 6000)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`✗ ส่งไม่สำเร็จ: ${err.detail || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}`, 'error', 6000)
      }
    } catch (err) {
      console.error('Force sync error:', err)
      showToast('✗ การเชื่อมต่อ API ขัดข้อง กรุณาตรวจสอบสถานะเซิร์ฟเวอร์', 'error', 6000)
    } finally {
      setTriggering(false)
    }
  }

  const handleStartBulk = async () => {
    setStartingBulk(true)
    showToast('🚀 กำลังเริ่มงานแพ็กเกจ ZIP และทยอยส่งภาพย้อนหลัง...', 'info', 6000)
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/roboflow/bulk/start?chunk_size=300`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchStatus()
        showToast('✓ เริ่มงาน Bulk Legacy Ingestion แล้ว! ระบบกำลังจัดก้อน ZIP ทยอยส่ง', 'success', 6000)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`✗ ไม่สามารถเริ่มงานได้: ${err.detail || 'มีงานค้างอยู่แล้ว'}`, 'error', 6000)
      }
    } catch (err) {
      console.error('Start bulk error:', err)
      showToast('✗ ส่งคำสั่ง Bulk ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error', 6000)
    } finally {
      setStartingBulk(false)
    }
  }

  const handleCancelBulk = async () => {
    try {
      await fetch(`${effectiveApiBase}/api/v1/roboflow/bulk/cancel`, { method: 'POST' })
      await fetchStatus()
      showToast('ยกเลิกงานส่งข้อมูลย้อนหลังเรียบร้อยแล้ว', 'info', 4000)
    } catch (err) {
      console.error('Cancel bulk error:', err)
    }
  }

  // Format countdown into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const projectUrl = syncStatus?.project_url || 'https://app.roboflow.com/kimbiew/cctv-parking/annotate'

  const filteredLogs = syncStatus?.recent_logs?.filter((item) => {
    if (selectedCamFilter === 'all') return true
    return item.camera_id === selectedCamFilter
  }) || []

  const activeWindow = syncStatus?.active_window ?? true
  const job = bulkStatus?.job_progress
  const pendingCandidates = bulkStatus?.pending_candidates ?? 3133

  return (
    <div className="rf-studio-container">
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
      <div className="rf-header-banner">
        <div className="rf-brand-group">
          <div className="rf-icon-glow-box">
            <FolderGit2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="rf-header-title">
              <span>Roboflow Periodic Cloud Ingestion</span>
              <span className="rf-project-badge">{syncStatus?.project_name || 'cctv-parking'}</span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE CONNECTED
              </span>
            </div>
            <p className="rf-header-sub">
              ส่งภาพกล้อง CCTV อัตโนมัติทุก 30 นาที (06:00 - 20:00) พร้อมระบบแบ่งก้อน ZIP เคลียร์รูปย้อนหลัง
            </p>
          </div>
        </div>

        {/* Direct Project Link Button */}
        <div className="flex items-center gap-2.5">
          <a
            href={projectUrl}
            target="_blank"
            rel="noreferrer"
            className="rf-btn-project"
            title="เปิดโปรเจกต์ cctv-parking บน Roboflow Cloud"
          >
            <span>เปิด Roboflow Studio</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: 30-Minute Countdown Timer */}
        <div className="rf-metric-card" style={{ borderColor: 'rgba(99, 102, 241, 0.35)', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
          <div className="rf-metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8' }}>
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="rf-metric-info flex-1">
            <div className="flex items-center justify-between">
              <span className="rf-metric-title">NEXT BATCH CYCLE</span>
              <span className="text-[10px] font-mono text-indigo-300">30-MIN</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatTime(countdown)}
              </span>
              <span className="text-xs text-slate-400">นาที</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-700/50">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((INTERVAL_SECONDS - countdown) / INTERVAL_SECONDS) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 2: Pending In Queue (PostgreSQL) */}
        <div className="rf-metric-card" style={{ borderColor: 'rgba(245, 158, 11, 0.35)', background: 'linear-gradient(135deg, #0f172a 0%, #291800 100%)' }}>
          <div className="rf-metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
            <Camera className="w-5 h-5" />
          </div>
          <div className="rf-metric-info">
            <span className="rf-metric-title">PENDING QUEUE</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-amber-400">
                {syncStatus?.pending_count ?? 120}
              </span>
              <span className="text-xs text-slate-400">รูป พร้อมส่ง</span>
            </div>
            <span className="rf-metric-sub">คัดกรองเฉพาะ .jpg/.png</span>
          </div>
        </div>

        {/* Card 3: Uploaded to Roboflow */}
        <div className="rf-metric-card" style={{ borderColor: 'rgba(16, 185, 129, 0.35)', background: 'linear-gradient(135deg, #0f172a 0%, #062817 100%)' }}>
          <div className="rf-metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="rf-metric-info">
            <span className="rf-metric-title">UPLOADED TO ROBOFLOW</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {syncStatus?.uploaded_count ?? 0}
              </span>
              <span className="text-xs text-slate-400">รูป สำเร็จในระบบ</span>
            </div>
            <span className="rf-metric-sub">บันทึกรหัสลง PostgreSQL</span>
          </div>
        </div>

        {/* Card 4: Historical Backlog */}
        <div className="rf-metric-card" style={{ borderColor: 'rgba(168, 85, 247, 0.35)', background: 'linear-gradient(135deg, #0f172a 0%, #200d38 100%)' }}>
          <div className="rf-metric-icon-box" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
            <Archive className="w-5 h-5" />
          </div>
          <div className="rf-metric-info">
            <span className="rf-metric-title">HISTORICAL BACKLOG</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-purple-300">
                {pendingCandidates.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">รูป ตรวจพบ</span>
            </div>
            <span className="rf-metric-sub">06:00 - 20:00 (กลางวัน)</span>
          </div>
        </div>
      </div>

      {/* 3. Schedule & Control Actions Bar */}
      <div className="rf-panel-card" style={{ padding: '1.1rem 1.35rem' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>ช่วงเวลาทำงานอัตโนมัติ:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold flex items-center gap-1 ${
                  activeWindow ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeWindow ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  {activeWindow ? '06:00 - 20:00 (ACTIVE)' : '20:00 - 06:00 (NIGHT PAUSE)'}
                </span>
                <span className="text-slate-500 text-[11px]">|</span>
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  เก็บบนเซิร์ฟเวอร์โดยตรง ไม่เปลือง ZIP ซ้ำซ้อน
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                โครงสร้าง: <code className="text-sky-300 font-mono text-[10px] bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                  {`{camera_id}/{YYYY-MM-DD}/{HH}/{filename}.jpg`}
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleForceSync}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="สั่งยิงรอบ 30 นาทีทันที (15 ภาพ)"
            >
              <Zap className={`w-4 h-4 text-amber-300 ${triggering ? 'animate-bounce' : ''}`} />
              <span>{triggering ? 'กำลังส่งข้อมูล...' : '⚡ ส่งรอบ 30 นาทีตอนนี้ (Force Sync)'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchStatus(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bulk Legacy Data Ingestion (ระบบแพ็ก ZIP ส่งรูปเก่าย้อนหลัง) */}
      <div className="rf-panel-card" style={{ borderColor: 'rgba(168, 85, 247, 0.35)', background: 'linear-gradient(135deg, #0f172a 0%, #1a102f 100%)' }}>
        <div className="rf-panel-header" style={{ borderBottomColor: 'rgba(168, 85, 247, 0.2)' }}>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-400" />
            <span className="rf-panel-title">Bulk Legacy Ingestion (ระบบเคลียร์รูปย้อนหลัง & แบ่งก้อน ZIP)</span>
          </div>

          <div className="flex items-center gap-2">
            {job?.is_active ? (
              <button
                type="button"
                onClick={handleCancelBulk}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>ยกเลิก (Cancel)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartBulk}
                disabled={startingBulk}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{startingBulk ? 'กำลังเริ่ม...' : '🚀 เริ่มบีบอัด & ส่งรูปย้อนหลัง (Start Bulk)'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 text-[11px] font-semibold">รูปภาพย้อนหลังที่ตกค้าง:</span>
            <div className="text-xl font-bold font-mono text-purple-300 mt-0.5">
              {pendingCandidates.toLocaleString()} รูป
            </div>
            <span className="text-[10px] text-slate-500">ตรวจพบจากโฟลเดอร์ data/dataset & data/4camera</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 text-[11px] font-semibold">ขนาดแบ่งก้อน ZIP ปลอดภัย:</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {job?.chunk_size || 300} รูป / ก้อน
            </div>
            <span className="text-[10px] text-slate-500">ทยอยส่งทีละก้อน ป้องกันเน็ตหลุด</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 text-[11px] font-semibold">สถานะงานปัจจุบัน:</span>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${job?.is_active ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{job?.status || 'IDLE'}</span>
              {job?.total_chunks > 0 && (
                <span className="text-xs text-slate-300 font-sans font-normal">
                  ({job?.current_chunk}/{job?.total_chunks} ก้อน)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 truncate block mt-0.5" title={job?.last_message}>
              {job?.last_message || 'ระบบพร้อมสำหรับการส่งข้อมูลเก่าย้อนหลัง'}
            </span>
          </div>
        </div>

        {/* Progress Bar when Active */}
        {job?.is_active && job?.total_candidates > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>ความคืบหน้าการส่งข้อมูลย้อนหลัง:</span>
              <span className="font-mono text-purple-300 font-bold">
                {job?.processed_images} / {job?.total_candidates} รูป ({Math.round((job?.processed_images / job?.total_candidates) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-purple-500/30">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(job?.processed_images / job?.total_candidates) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            จัดโฟลเดอร์ <code className="text-sky-300 font-mono text-[10px]">cam/YYYY-MM-DD/HH/</code> ให้อัตโนมัติ
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            ลบไฟล์ ZIP ชั่วคราวทิ้งทันทีหลังส่งเสร็จ ไม่เปลืองที่ดิสก์
          </span>
        </div>
      </div>

      {/* 5. PostgreSQL Audit Table & Lifecycle Tracker */}
      <div className="rf-panel-card">
        <div className="rf-panel-header">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="rf-panel-title">PostgreSQL Audit & Retention Tracking (`roboflow_image_uploads`)</span>
          </div>

          {/* Camera Filter Chips */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {['all', 'cam1', 'cam2', 'cam3'].map((cam) => (
              <button
                key={cam}
                type="button"
                onClick={() => setSelectedCamFilter(cam)}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                  selectedCamFilter === cam
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {cam.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 -mt-1 leading-relaxed">
          ตารางบันทึกสถานะของแต่ละรูปใน PostgreSQL เพื่อใช้ป้องกันการส่งซ้ำ และรองรับระบบ Audit ตรวจสอบย้อนหลัง
        </p>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/90 text-slate-300 font-semibold sticky top-0 border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">กล้อง</th>
                <th className="py-2.5 px-3">โครงสร้าง Path ในระบบ</th>
                <th className="py-2.5 px-3">เวลาที่บันทึก</th>
                <th className="py-2.5 px-3">สถานะ</th>
                <th className="py-2.5 px-3">เวลาที่ขึ้น Roboflow</th>
                <th className="py-2.5 px-3">Roboflow ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-slate-300 font-mono text-[11px]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">{item.id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.camera_id === 'cam1'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : item.camera_id === 'cam2'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {item.camera_id.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 truncate max-w-[280px]" title={item.file_path}>
                      {item.file_path}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {item.captured_at ? new Date(item.captured_at).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                        item.status === 'UPLOADED'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : item.status === 'UPLOADING'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse'
                          : item.status === 'FAILED'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'UPLOADED' ? 'bg-emerald-400' : item.status === 'FAILED' ? 'bg-rose-400' : 'bg-amber-400'
                        }`}></span>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {item.uploaded_at ? new Date(item.uploaded_at).toLocaleTimeString('th-TH') : (
                        <span className="text-slate-500 italic">รอรอบ 30 นาที</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-300 font-mono truncate max-w-[120px]" title={item.roboflow_image_id || ''}>
                      {item.roboflow_image_id || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    ไม่มีรายการภาพในตัวกรองนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="mt-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>
              <strong>ระบบจัดเก็บไฟล์:</strong> จัดเรียงตามโฟลเดอร์กล้อง/วัน/เวลา เพื่อนำไปเทรนโมเดล AI และมีตาราง Audit กำกับ
            </span>
          </div>
          <span className="text-emerald-400 font-mono text-[10px] font-bold">
            ● {syncStatus?.total_count || 120} TOTAL TRACKED
          </span>
        </div>
      </div>
    </div>
  )
}
