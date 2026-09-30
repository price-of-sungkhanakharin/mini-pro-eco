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
  Filter,
  Archive,
  Play,
  Square,
  Sparkles,
  ShieldCheck,
  Check,
  Info
} from 'lucide-react'

const INTERVAL_SECONDS = 1800 // 30 Minutes

const CAMERA_CHIPS = [
  { id: 'all', name: 'ทุกกล้อง (All Cameras)', label: 'ทุกโซน', color: 'indigo' },
  { id: 'cam1', name: 'CAM1 - ประตูทางเข้าหน้าภาค', label: 'หน้าภาค', color: 'blue' },
  { id: 'cam2', name: 'CAM2 - ลานจอดในร่ม', label: 'ลานในร่ม', color: 'purple' },
  { id: 'cam3', name: 'CAM3 - ลานจอดข้างภาค', label: 'ข้างภาค', color: 'cyan' },
]

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
  const [selectedCam, setSelectedCam] = useState('all')
  const [tableCamFilter, setTableCamFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }

  const fetchStatus = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const [syncRes, bulkRes] = await Promise.all([
        fetch(`${effectiveApiBase}/api/v1/roboflow/sync/status`),
        fetch(`${effectiveApiBase}/api/v1/roboflow/bulk/status?camera_id=${selectedCam}`)
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

  useEffect(() => {
    fetchStatus()
    const pollTimer = setInterval(() => fetchStatus(false), 3000)
    return () => clearInterval(pollTimer)
  }, [effectiveApiBase, selectedCam])

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
    const targetLabel = selectedCam === 'all' ? 'ทุกกล้อง (CAM1, CAM2, CAM3)' : selectedCam.toUpperCase()
    showToast(`🚀 เริ่มจัดส่งภาพย้อนหลังแยกตามกล้อง/วัน/ชั่วโมง (${targetLabel})...`, 'info', 6000)
    try {
      const camParam = selectedCam === 'all' ? '' : `&camera_id=${selectedCam}`
      const res = await fetch(`${effectiveApiBase}/api/v1/roboflow/bulk/start?chunk_size=300${camParam}`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchStatus()
        showToast(`✓ เริ่มส่งภาพย้อนหลัง ${targetLabel} เรียบร้อย! ระบบแบ่ง Batch ตามกล้อง วัน และชั่วโมงอัตโนมัติ`, 'success', 6000)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`✗ ไม่สามารถเริ่มงานได้: ${err.detail || 'มีงานค้างอยู่แล้ว'}`, 'error', 6000)
      }
    } catch (err) {
      console.error('Start bulk error:', err)
      showToast('✗ ส่งคำสั่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error', 6000)
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

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const projectUrl = syncStatus?.project_url || 'https://app.roboflow.com/kimbiew/cctv-parking/annotate'

  const filteredLogs = syncStatus?.recent_logs?.filter((item) => {
    if (tableCamFilter === 'all') return true
    return item.camera_id === tableCamFilter
  }) || []

  const activeWindow = syncStatus?.active_window ?? true
  const job = bulkStatus?.job_progress
  const camCounts = bulkStatus?.camera_counts || { all: 3133, cam1: 1045, cam2: 1044, cam3: 1044 }
  const totalUploadedCount = job?.uploaded_images || syncStatus?.uploaded_count || 0
  const totalBacklog = bulkStatus?.total_all_cameras || 3168

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

      {/* 1. Header Banner - Unified Setup View Header */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3.5">
          <div className="setup-icon-box">
            <FolderGit2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide">
                Roboflow Annotation Platform
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                kimbiew / {syncStatus?.project_name || 'cctv-parking'}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ACTIVE V1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ระบบส่งภาพ CCTV อัตโนมัติทุก 30 นาที แยกกลุ่มตาม <strong>กล้อง (CAM1/CAM2/CAM3) / วัน / ชั่วโมง</strong> พร้อมระบบ Audit ใน PostgreSQL
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleForceSync}
            disabled={triggering}
            className="btn-platform btn-platform-primary"
            title="สั่งยิงรอบ 30 นาทีทันที (15 ภาพ)"
          >
            <Zap className={`w-4 h-4 text-amber-300 ${triggering ? 'animate-bounce' : ''}`} />
            <span>{triggering ? 'กำลังส่ง...' : '⚡ Force Sync (30m)'}</span>
          </button>

          <a
            href={projectUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-platform btn-platform-purple"
            title="เปิดโปรเจกต์ cctv-parking บน Roboflow Studio"
          >
            <span>เปิด Roboflow Studio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => fetchStatus(true)}
            className="btn-platform btn-platform-dark p-2"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: 30-Min Countdown */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-indigo-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              รอบส่งอัตโนมัติ (30m)
            </span>
            <span className="font-mono text-[10px] text-slate-400">06:00-20:00</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatTime(countdown)}
            </span>
            <span className="text-xs text-slate-400">นาที</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden border border-slate-700/50">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((INTERVAL_SECONDS - countdown) / INTERVAL_SECONDS) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Pending Queue */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              คิวรอส่งรอบต่อไป
            </span>
            <span className="font-mono text-[10px] text-amber-400">PostgreSQL</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {syncStatus?.pending_count ?? 120}
            </span>
            <span className="text-xs text-slate-400">รูป พร้อมส่ง</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">คัดกรองเฉพาะภาพเวลากลางวัน</span>
        </div>

        {/* Card 3: Uploaded to Roboflow */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              อัปโหลดสำเร็จแล้ว
            </span>
            <span className="font-mono text-[10px] text-emerald-400">Roboflow Cloud</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {totalUploadedCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">รูป ในระบบ</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">บันทึกรหัส Roboflow ID ครบถ้วน</span>
        </div>

        {/* Card 4: Historical Backlog */}
        <div className="setup-content-card" style={{ padding: '1rem 1.15rem' }}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-purple-300 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" />
              ภาพประวัติทั้งหมด
            </span>
            <span className="font-mono text-[10px] text-purple-400">3 กล้อง</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {totalBacklog.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">รูป ทั้งหมด</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">CAM1, CAM2, CAM3</span>
        </div>
      </div>

      {/* 3. Camera Partitioned Historical Sync Control */}
      <div className="setup-content-card">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="section-title-sm">
              <Archive className="w-4 h-4 text-purple-400" />
              <span>Camera Partitioned Sync (ระบบส่งรูปย้อนหลังแยกตามกล้อง / วัน / ชั่วโมง)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              เลือกกล้องที่ต้องการส่ง หรือส่งทั้งหมดพร้อมกัน โดยระบบจะสร้าง Batch บน Roboflow เป็น <code>CAM1_2026-09-24_06h</code> ให้อัตโนมัติ ไม่ปนกัน
            </p>
          </div>

          <div className="flex items-center gap-2">
            {job?.is_active ? (
              <button
                type="button"
                onClick={handleCancelBulk}
                className="btn-platform btn-platform-rose"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>ยกเลิกงาน (Cancel)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartBulk}
                disabled={startingBulk}
                className="btn-platform btn-platform-purple"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {startingBulk
                    ? 'กำลังเริ่มส่ง...'
                    : `🚀 ส่งรูปย้อนหลัง (${selectedCam === 'all' ? 'ทุกกล้อง' : selectedCam.toUpperCase()})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Camera Selector Tab Chips */}
        <div className="mt-3.5">
          <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>เลือกกลุ่มกล้องที่ต้องการส่ง:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CAMERA_CHIPS.map((cam) => {
              const count = camCounts[cam.id] || 0
              const isSelected = selectedCam === cam.id
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedCam(cam.id)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                      {cam.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono text-white">
                      {count.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">รูป</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Batch Naming Structure Box */}
        <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-400 text-[11px] font-semibold block">รูปแบบ Batch Name บน Roboflow:</span>
            <div className="text-xs font-mono font-bold text-sky-300 mt-1 bg-sky-950/50 px-2 py-1 rounded border border-sky-800/40">
              {selectedCam === 'all' ? 'CAM1_YYYY-MM-DD_HHh, CAM2_...' : `${selectedCam.toUpperCase()}_YYYY-MM-DD_HHh`}
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] font-semibold block">แท็กกำกับ (Roboflow Tags):</span>
            <div className="text-xs font-mono text-purple-300 mt-1 flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">{selectedCam === 'all' ? 'cam1/cam2/cam3' : selectedCam}</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">2026-09-24</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">06:00 - 20:00</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] font-semibold block">สถานะงานปัจจุบัน:</span>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${job?.is_active ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{job?.status || 'IDLE'}</span>
              {job?.target_camera && (
                <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1 rounded">[{job.target_camera}]</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 truncate block mt-0.5" title={job?.last_message}>
              {job?.last_message || 'พร้อมส่งข้อมูล'}
            </span>
          </div>
        </div>

        {/* Live Progress Bar when Active */}
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
      </div>

      {/* 4. PostgreSQL Audit Table & Lifecycle Tracker */}
      <div className="setup-content-card">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="section-title-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>PostgreSQL Audit Tracking (`roboflow_image_uploads`)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ตารางบันทึกสถานะของแต่ละรูปในฐานข้อมูล ป้องกันการส่งซ้ำ 100%
            </p>
          </div>

          {/* Camera Filter Chips for Table */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {['all', 'cam1', 'cam2', 'cam3'].map((cam) => (
              <button
                key={cam}
                type="button"
                onClick={() => setTableCamFilter(cam)}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                  tableCamFilter === cam
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {cam.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 max-h-[360px] overflow-y-auto mt-3">
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
      </div>
    </div>
  )
}
