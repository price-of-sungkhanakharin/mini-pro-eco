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
  Database,
  Archive,
  Play,
  Square,
  Sparkles,
  Check,
  FolderGit2,
  Tag,
  ArrowUpRight
} from 'lucide-react'

const INTERVAL_SECONDS = 1800 // 30 Minutes

const CAMERA_CHIPS = [
  { id: 'all', name: 'ทุกกล้อง (All Cameras)', shortName: 'ทุกกล้อง', desc: 'CAM-01, 02, 03' },
  { id: 'cam1', name: 'CAM-01 (ประตูหน้าภาค)', shortName: 'CAM-01', desc: 'ประตูทางเข้าหลัก' },
  { id: 'cam2', name: 'CAM-02 (ลานจอดในร่ม)', shortName: 'CAM-02', desc: 'ใต้อาคารเรียน' },
  { id: 'cam3', name: 'CAM-03 (ลานจอดข้างภาค)', shortName: 'CAM-03', desc: 'ลานจอดกลางแจ้ง' },
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
        showToast(`สำเร็จ: อัปโหลดภาพ ${result.uploaded || 15} รูปขึ้น Roboflow เรียบร้อยแล้ว`, 'success', 6000)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`ไม่สำเร็จ: ${err.detail || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}`, 'error', 6000)
      }
    } catch (err) {
      console.error('Force sync error:', err)
      showToast('การเชื่อมต่อ API ขัดข้อง กรุณาตรวจสอบสถานะเซิร์ฟเวอร์', 'error', 6000)
    } finally {
      setTriggering(false)
    }
  }

  const handleStartBulk = async () => {
    setStartingBulk(true)
    const targetLabel = selectedCam === 'all' ? 'ทุกกล้อง (CAM1, CAM2, CAM3)' : selectedCam.toUpperCase()
    showToast(`เริ่มจัดส่งภาพย้อนหลังแยกตามกล้อง/วัน/ชั่วโมง (${targetLabel})...`, 'info', 6000)
    try {
      const camParam = selectedCam === 'all' ? '' : `&camera_id=${selectedCam}`
      const res = await fetch(`${effectiveApiBase}/api/v1/roboflow/bulk/start?chunk_size=300${camParam}`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchStatus()
        showToast(`เริ่มส่งภาพย้อนหลัง ${targetLabel} เรียบร้อย! ระบบแบ่ง Batch ตามกล้อง วัน และชั่วโมงอัตโนมัติ`, 'success', 6000)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`ไม่สามารถเริ่มงานได้: ${err.detail || 'มีงานค้างอยู่แล้ว'}`, 'error', 6000)
      }
    } catch (err) {
      console.error('Start bulk error:', err)
      showToast('ส่งคำสั่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error', 6000)
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

  const getFileName = (path) => {
    if (!path) return '-'
    return path.split('/').pop()
  }

  const projectUrl = syncStatus?.project_url || 'https://app.roboflow.com/kimbiew/cctv-parking/annotate'

  const filteredLogs = syncStatus?.recent_logs?.filter((item) => {
    if (tableCamFilter === 'all') return true
    return item.camera_id?.toLowerCase() === tableCamFilter.toLowerCase()
  }) || []

  const job = bulkStatus?.job_progress
  const camCounts = bulkStatus?.camera_counts || { all: 3133, cam1: 1045, cam2: 1044, cam3: 1044 }
  const totalUploadedCount = job?.uploaded_images || syncStatus?.uploaded_count || 0
  const totalBacklog = bulkStatus?.total_all_cameras || 3168

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
          <div className="rf-icon-badge">
            <FolderGit2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="rf-title-row">
              <h2 className="rf-title">Roboflow Annotation Platform</h2>
              <span className="rf-badge-active">
                <span className="rf-pulse-dot"></span>
                ACTIVE V1
              </span>
            </div>
            <p className="rf-desc">
              ระบบส่งภาพจากกล้อง CCTV สู่แพลตฟอร์ม Roboflow โดยอัตโนมัติทุก 30 นาที แยกกลุ่มตาม กล้อง / วัน / ชั่วโมง พร้อมระบบ Audit Log ใน PostgreSQL ป้องกันภาพซ้ำ
            </p>
            <div className="rf-meta-tags">
              <span className="rf-tag font-mono text-indigo-300">
                Workspace: kimbiew / {syncStatus?.project_name || 'cctv-parking'}
              </span>
              <span className="rf-tag text-slate-400">
                โหมด: 06:00 - 20:00 (Daylight Ingestion)
              </span>
              <span className="rf-tag text-slate-400">
                Format: 15 ภาพ / รอบ
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="rf-overview-actions">
          <button
            type="button"
            onClick={handleForceSync}
            disabled={triggering}
            className="rf-btn-sync-now"
            title="สั่งยิงรอบ 30 นาทีทันที (15 ภาพ)"
          >
            <Zap className={`w-4 h-4 text-amber-300 ${triggering ? 'animate-bounce' : ''}`} />
            <span>{triggering ? 'กำลังส่งภาพ...' : 'ซิงค์ภาพทันที (Force Sync)'}</span>
          </button>

          <a
            href={projectUrl}
            target="_blank"
            rel="noreferrer"
            className="rf-btn-cloud-open"
            title="เปิดโปรเจกต์ kimbiew/cctv-parking บน Roboflow Studio"
          >
            <span>เปิด Roboflow Studio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => fetchStatus(true)}
            className="rf-btn-refresh-icon"
            title="รีเฟรชข้อมูลสถานะ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics & Schedule Cards */}
      <div className="rf-metrics-grid">
        {/* Metric 1: 30-min Auto-Sync Countdown */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Clock className="w-3.5 h-3.5" />
              รอบส่งอัตโนมัติ (30m)
            </span>
            <span className="font-mono text-[10px] text-slate-400">06:00 - 20:00</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num">{formatTime(countdown)}</span>
            <span className="rf-metric-unit">นาที</span>
          </div>
          <div className="rf-progress-bar">
            <div
              className="rf-progress-fill"
              style={{ width: `${((INTERVAL_SECONDS - countdown) / INTERVAL_SECONDS) * 100}%` }}
            ></div>
          </div>
          <span className="rf-metric-hint">นับถอยหลังสู่งวดถัดไป</span>
        </div>

        {/* Metric 2: Pending Queue */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Camera className="w-3.5 h-3.5" />
              คิวรอส่งรอบต่อไป
            </span>
            <span className="font-mono text-[10px] text-amber-500">PostgreSQL</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num" style={{ color: '#fbbf24' }}>
              {(syncStatus?.pending_count ?? 120).toLocaleString()}
            </span>
            <span className="rf-metric-unit">รูป พร้อมส่ง</span>
          </div>
          <span className="rf-metric-hint">คัดกรองเฉพาะภาพเวลากลางวัน</span>
        </div>

        {/* Metric 3: Uploaded to Roboflow Cloud */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              อัปโหลดสำเร็จแล้ว
            </span>
            <span className="font-mono text-[10px] text-emerald-500">Cloud Sync</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num" style={{ color: '#34d399' }}>
              {totalUploadedCount.toLocaleString()}
            </span>
            <span className="rf-metric-unit">รูป ในระบบ</span>
          </div>
          <span className="rf-metric-hint">บันทึก Roboflow Image ID ครบ</span>
        </div>

        {/* Metric 4: Historical Backlog Total */}
        <div className="rf-metric-box">
          <div className="rf-metric-top">
            <span className="flex items-center gap-1.5 text-purple-400">
              <Archive className="w-3.5 h-3.5" />
              ภาพประวัติสะสมทั้งหมด
            </span>
            <span className="font-mono text-[10px] text-purple-400">3 จุดกล้อง</span>
          </div>
          <div className="rf-metric-body">
            <span className="rf-metric-num" style={{ color: '#c084fc' }}>
              {totalBacklog.toLocaleString()}
            </span>
            <span className="rf-metric-unit">รูป ทั้งหมด</span>
          </div>
          <span className="rf-metric-hint">CAM-01, CAM-02, CAM-03</span>
        </div>
      </div>

      {/* 3. Camera Partitioned Historical Sync Control */}
      <div className="rf-card-block">
        <div className="rf-card-block-header">
          <div>
            <h3 className="rf-block-title">
              <Archive className="w-4 h-4 text-purple-400" />
              <span>ส่งภาพย้อนหลังแยกตามกล้อง (Partitioned Historical Backlog Sync)</span>
            </h3>
            <p className="rf-block-desc">
              ส่งภาพย้อนหลังทั้งหมดขึ้น Roboflow เพื่อเตรียม Dataset สำหรับ Train โดยระบบจะสร้าง Batch Name แยกตามกล้อง วัน และชั่วโมงอัตโนมัติ (เช่น <code>CAM1_2026-09-24_08h</code>)
            </p>
          </div>

          <div>
            {job?.is_active ? (
              <button
                type="button"
                onClick={handleCancelBulk}
                className="rf-btn-cancel-job"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>ยกเลิกงาน (Cancel Job)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartBulk}
                disabled={startingBulk}
                className="rf-btn-start-job"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {startingBulk
                    ? 'กำลังเริ่มส่ง...'
                    : `ส่งภาพย้อนหลัง (${selectedCam === 'all' ? 'ทุกกล้อง' : selectedCam.toUpperCase()})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Camera Selector Grid */}
        <div className="rf-cam-grid">
          {CAMERA_CHIPS.map((cam) => {
            const count = camCounts[cam.id] || 0
            const isSelected = selectedCam === cam.id
            return (
              <div
                key={cam.id}
                onClick={() => setSelectedCam(cam.id)}
                className={`rf-cam-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="rf-cam-card-top">
                  <span>{cam.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="rf-cam-card-bottom">
                  <span className="rf-cam-num">{count.toLocaleString()}</span>
                  <span className="rf-cam-unit">รูป</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Status & Partitioning Banner */}
        <div className="rf-status-banner">
          <div className="rf-status-item">
            <span className="rf-status-item-label">โครงสร้าง Batch Name บน Roboflow</span>
            <span className="rf-status-item-val font-mono text-sky-300">
              {selectedCam === 'all'
                ? 'CAM{1..3}_YYYY-MM-DD_HHh'
                : `${selectedCam.toUpperCase()}_YYYY-MM-DD_HHh`}
            </span>
          </div>

          <div className="rf-status-item">
            <span className="rf-status-item-label">แท็กกำกับภาพ (Tags)</span>
            <span className="rf-status-item-val font-mono text-purple-300">
              {selectedCam === 'all' ? 'cam1, cam2, cam3' : selectedCam} • 2026-09-24 • 06:00-20:00
            </span>
          </div>

          <div className="rf-status-item">
            <span className="rf-status-item-label">สถานะ Worker</span>
            <span className="rf-status-item-val flex items-center gap-1.5 font-mono text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${job?.is_active ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{job?.status || 'IDLE'}</span>
              {job?.target_camera && (
                <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded">[{job.target_camera}]</span>
              )}
            </span>
          </div>

          <div className="rf-status-item" style={{ flex: '1 1 200px' }}>
            <span className="rf-status-item-label">ข้อความล่าสุด</span>
            <span className="rf-status-item-val text-slate-300 truncate" title={job?.last_message}>
              {job?.last_message || 'พร้อมส่งข้อมูลย้อนหลัง'}
            </span>
          </div>
        </div>

        {/* Active Job Progress Bar */}
        {job?.is_active && job?.total_candidates > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>ความคืบหน้าการส่งข้อมูลภาพย้อนหลัง:</span>
              <span className="font-mono text-purple-300 font-bold">
                {job?.processed_images} / {job?.total_candidates} รูป ({Math.round((job?.processed_images / job?.total_candidates) * 100)}%)
              </span>
            </div>
            <div className="rf-progress-bar-lg">
              <div
                className="rf-progress-fill-purple"
                style={{ width: `${(job?.processed_images / job?.total_candidates) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 4. PostgreSQL Audit Table & Lifecycle Tracker */}
      <div className="rf-card-block">
        <div className="rf-card-block-header">
          <div>
            <h3 className="rf-block-title">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>ประวัติการส่งข้อมูลภาพ (Audit Logs - roboflow_image_uploads)</span>
            </h3>
            <p className="rf-block-desc">
              ตารางตรวจสอบสถานะการบันทึกและอัปโหลดของแต่ละรูปใน PostgreSQL ป้องกันการส่งซ้ำ 100%
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="rf-tab-filters">
            {['all', 'cam1', 'cam2', 'cam3'].map((cam) => (
              <button
                key={cam}
                type="button"
                onClick={() => setTableCamFilter(cam)}
                className={`rf-filter-btn ${tableCamFilter === cam ? 'active' : ''}`}
              >
                {cam === 'all' ? 'ALL CAMERAS' : cam.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Data Table */}
        <div className="rf-table-container">
          <table className="rf-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th style={{ width: '90px' }}>กล้อง</th>
                <th>ชื่อไฟล์ภาพ</th>
                <th style={{ width: '150px' }}>เวลาที่บันทึก</th>
                <th style={{ width: '110px' }}>สถานะ</th>
                <th style={{ width: '130px' }}>เวลาส่ง Roboflow</th>
                <th style={{ width: '130px' }}>Roboflow Image ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item) => {
                  const camId = item.camera_id ? item.camera_id.toLowerCase() : 'cam1'
                  const statusKey = item.status ? item.status.toLowerCase() : 'pending'
                  const fileName = getFileName(item.file_path)

                  return (
                    <tr key={item.id} className="rf-table-row">
                      <td className="font-mono text-slate-500">{item.id}</td>
                      <td>
                        <span className={`rf-cam-pill ${camId}`}>
                          {item.camera_id ? item.camera_id.toUpperCase() : '-'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-mono text-slate-200 block truncate max-w-[260px]"
                          title={item.file_path}
                        >
                          {fileName}
                        </span>
                      </td>
                      <td className="text-slate-400 font-mono text-[11px]">
                        {item.captured_at
                          ? new Date(item.captured_at).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td>
                        <span className={`rf-badge-status ${statusKey}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            statusKey === 'uploaded' ? 'bg-emerald-400' :
                            statusKey === 'uploading' ? 'bg-sky-400' :
                            statusKey === 'failed' ? 'bg-rose-400' : 'bg-amber-400'
                          }`}></span>
                          {item.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="text-slate-400 font-mono text-[11px]">
                        {item.uploaded_at ? (
                          new Date(item.uploaded_at).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                        ) : (
                          <span className="text-slate-500 italic">รอรอบ 30 นาที</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="font-mono text-indigo-300 block truncate max-w-[120px]"
                          title={item.roboflow_image_id || ''}
                        >
                          {item.roboflow_image_id || '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
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
