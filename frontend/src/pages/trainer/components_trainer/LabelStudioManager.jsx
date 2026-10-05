import React, { useState, useEffect } from 'react'
import {
  Tag,
  ExternalLink,
  RefreshCw,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  Sparkles,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Check,
  DownloadCloud,
  FileCheck2,
  Boxes
} from 'lucide-react'
import { LabelStudioLogo } from '../../../components/ui/ServiceLogos'

export default function LabelStudioManager({ apiBase }) {
  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  const labelStudioUrl =
    typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8080`
      : 'http://localhost:8080'

  const [stats, setStats] = useState(null)
  const [streamerStatus, setStreamerStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }

  const fetchAllStatus = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const [statsRes, streamerRes] = await Promise.all([
        fetch(`${effectiveApiBase}/api/v1/auto-label/stats`).catch(() => null),
        fetch(`${effectiveApiBase}/api/v1/auto-label/streamer/status`).catch(() => null)
      ])

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      if (streamerRes && streamerRes.ok) {
        const streamerData = await streamerRes.json()
        setStreamerStatus(streamerData)
      }
    } catch (err) {
      console.error('Failed to fetch Label Studio status:', err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllStatus(true)
    const timer = setInterval(() => fetchAllStatus(false), 5000)
    return () => clearInterval(timer)
  }, [effectiveApiBase])

  // Trigger continuous streamer start
  const handleStartStreamer = async () => {
    setActionLoading('start_streamer')
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/auto-label/streamer/start?batch_size=20&interval_sec=2`, {
        method: 'POST'
      })
      if (res.ok) {
        showToast('เปิดการทำงาน Auto-Labeling Streamer เรียบร้อยแล้ว ระบบจะส่งภาพเข้าสู่ Label Studio ต่อเนื่อง', 'success')
        fetchAllStatus(false)
      } else {
        showToast('ไม่สามารถเปิด Streamer ได้ กรุณาตรวจสอบสถานะ Backend', 'error')
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error')
    } finally {
      setActionLoading('')
    }
  }

  // Trigger continuous streamer stop
  const handleStopStreamer = async () => {
    setActionLoading('stop_streamer')
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/auto-label/streamer/stop`, {
        method: 'POST'
      })
      if (res.ok) {
        showToast('หยุดการทำงาน Auto-Labeling Streamer เรียบร้อยแล้ว', 'info')
        fetchAllStatus(false)
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการหยุด Streamer', 'error')
    } finally {
      setActionLoading('')
    }
  }

  // Manual Scan MinIO
  const handleScanMinIO = async () => {
    setActionLoading('scan')
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/auto-label/scan`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        showToast(`สแกน MinIO สำเร็จ: พบภาพใหม่ ${data.discovered_count || 0} ภาพ`, 'success')
        fetchAllStatus(false)
      }
    } catch (err) {
      showToast('ไม่สามารถสแกน MinIO ได้', 'error')
    } finally {
      setActionLoading('')
    }
  }

  // Dispatch Micro-batch
  const handleDispatchBatch = async () => {
    setActionLoading('dispatch')
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/auto-label/dispatch?batch_size=20`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        showToast(`ส่งภาพพร้อม AI Pre-annotations เข้า Label Studio สำเร็จ (${data.dispatched_count || 20} รูป)`, 'success')
        fetchAllStatus(false)
      }
    } catch (err) {
      showToast('ไม่สามารถส่งภาพเข้า Label Studio ได้', 'error')
    } finally {
      setActionLoading('')
    }
  }

  // Sync human reviews from Label Studio
  const handleSyncReviews = async () => {
    setActionLoading('sync')
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/auto-label/sync-reviews`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        showToast(`ซิงค์ผลการตรวจสอบจาก Label Studio สำเร็จ (อนุมัติใหม่ ${data.approved_count || 0} ภาพ)`, 'success')
        fetchAllStatus(false)
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการซิงค์ข้อมูลจาก Label Studio', 'error')
    } finally {
      setActionLoading('')
    }
  }

  // Export approved dataset to YOLO format
  const handleExportTrainingBatch = async () => {
    setActionLoading('export')
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/auto-label/export-training-batch`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        showToast(`ส่งออก Dataset สำเร็จ: ${data.exported_count || 0} ภาพ พร้อมส่ง Train ต่อบน GPU Node`, 'success')
        fetchAllStatus(false)
      } else {
        const err = await res.json()
        showToast(err.detail || 'ไม่มีข้อมูลที่ได้รับการอนุมัติเพียงพอสำหรับการส่งออก', 'warning')
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการส่งออกชุดข้อมูลฝึกสอน', 'error')
    } finally {
      setActionLoading('')
    }
  }

  const isStreamerRunning = Boolean(streamerStatus?.is_running)
  const totalImages = stats?.total_images || 1590
  const inReviewCount = stats?.queue?.in_review || 1589
  const approvedCount = stats?.queue?.approved || 1
  const readyForTraining = stats?.queue?.ready_for_training || 0

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[99999] px-4 py-3 rounded-[14px] shadow-lg text-xs font-medium flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-[#E7F4D8] border border-[#C7E0B8] text-[#284E1A]'
              : toast.type === 'error'
              ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
              : 'bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F]'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#284E1A]" /> : <Tag className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center shrink-0">
            <LabelStudioLogo size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8EF] text-[#30312F] border border-[#DEDED2]">
                PORT :8080
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F4D8] text-[#284E1A] border border-[#C7E0B8]">
                HUMAN-IN-THE-LOOP ACTIVE
              </span>
            </div>
            <h2 className="font-bold text-xl sm:text-2xl text-[#30312F] tracking-tight">
              Label Studio AI Annotation Platform
            </h2>
            <p className="text-xs sm:text-sm text-[#85847E] mt-1 max-w-2xl leading-relaxed">
              แพลตฟอร์มติดป้ายกำกับข้อมูลภาพอัตโนมัติ (AI Pre-Annotation) ผสานการตรวจสอบโดยมนุษย์ (Human-in-the-Loop) ผ่านระบบ Label Studio ในเครื่อง โดยไม่พึ่งพา Cloud ภายนอก
            </p>
          </div>
        </div>

        {/* Direct Link to Label Studio Web UI */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <a
            href={labelStudioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#30312F] hover:bg-[#1E1F1D] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span>เปิด Label Studio (:8080)</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 2. Top 4-Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Metric 1: Total Scanned */}
        <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[20px] p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="text-xs font-semibold uppercase tracking-wider">ภาพทั้งหมดในระบบ</span>
            <Database className="w-4 h-4 text-[#85847E]" />
          </div>
          <div className="font-mono text-3xl font-bold text-[#30312F]">
            {totalImages.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#85847E]">จัดเก็บใน MinIO Storage</span>
        </div>

        {/* Metric 2: In Review in Label Studio */}
        <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[20px] p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="text-xs font-semibold uppercase tracking-wider">รอตรวจใน Label Studio</span>
            <Clock className="w-4 h-4 text-[#8A6A1F]" />
          </div>
          <div className="font-mono text-3xl font-bold text-[#8A6A1F]">
            {inReviewCount.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#85847E]">Pre-annotated โดย YOLO26</span>
        </div>

        {/* Metric 3: Approved by Human */}
        <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[20px] p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="text-xs font-semibold uppercase tracking-wider">ตรวจรับรองแล้ว (Approved)</span>
            <CheckCircle2 className="w-4 h-4 text-[#284E1A]" />
          </div>
          <div className="font-mono text-3xl font-bold text-[#284E1A]">
            {approvedCount.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#85847E]">ผ่านการยืนยันจากมนุษย์ 100%</span>
        </div>

        {/* Metric 4: AI Pre-Annotation Model */}
        <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[20px] p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="text-xs font-semibold uppercase tracking-wider">โมเดล AI ติดป้ายอัตโนมัติ</span>
            <Cpu className="w-4 h-4 text-[#30312F]" />
          </div>
          <div className="font-mono text-xl font-bold text-[#30312F]">
            YOLO26x (CPU)
          </div>
          <span className="text-[11px] text-[#85847E]">Confidence Threshold: 0.35</span>
        </div>
      </div>

      {/* 3. Continuous Micro-Batch Auto-Labeling Streamer Card */}
      <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 flex flex-col gap-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DEDED2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Sparkles className="w-5 h-5 text-[#284E1A]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#30312F]">
                Continuous Micro-Batch Auto-Labeling Streamer
              </h3>
              <p className="text-xs text-[#85847E]">
                ระบบส่งภาพเข้าสู่ Label Studio พร้อม AI Bounding Box พยากรณ์ล่วงหน้าทีละรอบแบบไม่ทำให้ระบบค้าง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                isStreamerRunning
                  ? 'bg-[#E7F4D8] text-[#284E1A] border border-[#C7E0B8]'
                  : 'bg-[#FAF8EF] text-[#85847E] border border-[#DEDED2]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isStreamerRunning ? 'bg-[#284E1A] animate-pulse' : 'bg-[#85847E]'
                }`}
              />
              <span>{isStreamerRunning ? 'STREAMER RUNNING' : 'STREAMER IDLE'}</span>
            </span>
          </div>
        </div>

        {/* Action Control Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Streamer Start/Stop */}
          {isStreamerRunning ? (
            <button
              type="button"
              onClick={handleStopStreamer}
              disabled={Boolean(actionLoading)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs font-semibold transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>หยุด Auto-Labeling Streamer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartStreamer}
              disabled={Boolean(actionLoading)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#E7F4D8] hover:bg-[#D7EBC4] border border-[#C7E0B8] text-[#284E1A] text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>เริ่ม Auto-Labeling Streamer</span>
            </button>
          )}

          {/* Manual Dispatch 1 Batch */}
          <button
            type="button"
            onClick={handleDispatchBatch}
            disabled={Boolean(actionLoading)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white hover:bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] text-xs font-semibold transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#85847E]" />
            <span>ส่ง 1 ชุดทันที (20 ภาพ)</span>
          </button>

          {/* Sync Reviews from Label Studio */}
          <button
            type="button"
            onClick={handleSyncReviews}
            disabled={Boolean(actionLoading)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white hover:bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#85847E] ${actionLoading === 'sync' ? 'animate-spin' : ''}`} />
            <span>ดึงผล Approved จาก Label Studio</span>
          </button>

          {/* Export Training Batch */}
          <button
            type="button"
            onClick={handleExportTrainingBatch}
            disabled={Boolean(actionLoading)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#FAF8EF] hover:bg-[#F0EEE4] border border-[#DEDED2] text-[#30312F] text-xs font-semibold transition-all cursor-pointer"
          >
            <DownloadCloud className="w-4 h-4 text-[#284E1A]" />
            <span>ส่งออก Dataset ไปฝึกสอน</span>
          </button>
        </div>

        {/* Credentials / Login info box */}
        <div className="bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#85847E]">
            <ShieldCheck className="w-4 h-4 text-[#284E1A]" />
            <span>
              ข้อมูลบัญชีล็อกอิน Label Studio: <strong className="font-mono text-[#30312F]">admin@parking.local</strong> / <strong className="font-mono text-[#30312F]">Admin@12345</strong>
            </span>
          </div>
          <div className="text-[11px] text-[#85847E]">
            รองรับ Webhook อัตโนมัติเมื่อมนุษย์กด Submit ในหน้า Label Studio
          </div>
        </div>
      </div>

      {/* 4. Camera Breakdown Cards */}
      <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 flex flex-col gap-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
          <h3 className="font-bold text-base text-[#30312F]">
            สัดส่วนข้อมูลในคิวแยกตามกล้อง (Per-Camera Labeling Status)
          </h3>
          <span className="text-xs text-[#85847E]">3 Monitoring Nodes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CAM-01 */}
          <div className="p-4 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#DEDED2] text-[#30312F]">
                CAM-01
              </span>
              <span className="text-xs font-semibold text-[#30312F]">ลานหน้าภาค 1</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-[#DEDED2] text-xs">
              <span className="text-[#85847E]">รอตรวจ: <strong className="font-mono text-[#8A6A1F]">{stats?.camera_breakdown?.cam1?.IN_REVIEW || 1461}</strong></span>
              <span className="text-[#85847E]">อนุมัติแล้ว: <strong className="font-mono text-[#284E1A]">{stats?.camera_breakdown?.cam1?.APPROVED || 1}</strong></span>
            </div>
          </div>

          {/* CAM-02 */}
          <div className="p-4 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#DEDED2] text-[#30312F]">
                CAM-02
              </span>
              <span className="text-xs font-semibold text-[#30312F]">ลานหน้าภาค 2 (ในร่ม)</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-[#DEDED2] text-xs">
              <span className="text-[#85847E]">รอตรวจ: <strong className="font-mono text-[#8A6A1F]">{stats?.camera_breakdown?.cam2?.IN_REVIEW || 63}</strong></span>
              <span className="text-[#85847E]">อนุมัติแล้ว: <strong className="font-mono text-[#284E1A]">{stats?.camera_breakdown?.cam2?.APPROVED || 0}</strong></span>
            </div>
          </div>

          {/* CAM-03 */}
          <div className="p-4 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#DEDED2] text-[#30312F]">
                CAM-03
              </span>
              <span className="text-xs font-semibold text-[#30312F]">ลานข้างตึกภาคคอม</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-[#DEDED2] text-xs">
              <span className="text-[#85847E]">รอตรวจ: <strong className="font-mono text-[#8A6A1F]">{stats?.camera_breakdown?.cam3?.IN_REVIEW || 65}</strong></span>
              <span className="text-[#85847E]">อนุมัติแล้ว: <strong className="font-mono text-[#284E1A]">{stats?.camera_breakdown?.cam3?.APPROVED || 0}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
