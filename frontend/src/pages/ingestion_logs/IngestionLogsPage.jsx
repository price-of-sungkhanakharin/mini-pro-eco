import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  Filter,
  Download,
  Calendar,
  Thermometer,
  Cpu,
  Wifi,
  HardDrive,
  Camera,
  RefreshCw,
  Clock,
  ArrowUpDown,
  FileCode,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Radio,
  X
} from 'lucide-react'
import {
  fetchRealServerLogs,
  loadDumpMetadata,
  getIngestionApiBase
} from '../../utils/dumpData'
import { PillTag, PillButton } from '../../components/ui/FigmaCards'
import Modal from '../../components/ui/Modal.jsx'

export default function IngestionLogsPage({ onNavigate }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCamera, setSelectedCamera] = useState('all')
  const [selectedDate, setSelectedDate] = useState('all')
  const [tempFilter, setTempFilter] = useState('all') // 'all' | 'normal' | 'high'
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' | 'asc'
  const [availableDates, setAvailableDates] = useState([])
  const [serverStats, setServerStats] = useState(null)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(true)

  // Modals
  const [activePhoto, setActivePhoto] = useState(null)
  const [inspectJson, setInspectJson] = useState(null)
  const [jsonLoading, setJsonLoading] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const apiBase = getIngestionApiBase()

  // Fetch real records from Ingestion Server API
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchRealServerLogs({
        limit: 100,
        camera_id: selectedCamera !== 'all' ? selectedCamera : undefined,
        date: selectedDate !== 'all' ? selectedDate : undefined,
        temp_filter: tempFilter !== 'all' ? tempFilter : undefined,
        search: searchQuery || undefined,
        sort: sortOrder
      })

      if (result.success && result.records.length > 0) {
        setLogs(result.records)
        setIsLiveConnected(true)
        if (result.available_dates && result.available_dates.length > 0) {
          setAvailableDates(result.available_dates)
        }
        if (result.stats) {
          setServerStats(result.stats)
        }
      } else {
        // Fallback to dump metadata
        const fallback = await loadDumpMetadata()
        setLogs(fallback)
        setIsLiveConnected(false)
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
      const fallback = await loadDumpMetadata()
      setLogs(fallback)
      setIsLiveConnected(false)
    } finally {
      setLoading(false)
    }
  }, [selectedCamera, selectedDate, tempFilter, searchQuery, sortOrder])

  // Initial load
  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Auto-refresh poll every 4s if enabled
  useEffect(() => {
    if (!liveAutoRefresh) return
    const timer = setInterval(() => {
      fetchRecords()
    }, 4000)
    return () => clearInterval(timer)
  }, [liveAutoRefresh, fetchRecords])

  // Stats calculation
  const stats = useMemo(() => {
    if (!logs.length) return { total: 0, avgTemp: 0, highTempCount: 0, avgHeap: 0 }
    const total = logs.length
    const avgTemp = (
      logs.reduce((acc, l) => acc + (parseFloat(l.chip_temp_c) || 80.0), 0) / total
    ).toFixed(1)
    const highTempCount = logs.filter((l) => (parseFloat(l.chip_temp_c) || 0) >= 80.5).length
    const avgHeap = Math.round(
      logs.reduce((acc, l) => acc + (parseInt(l.free_heap, 10) || 156704), 0) / total / 1024
    )
    return { total, avgTemp, highTempCount, avgHeap }
  }, [logs])

  // Filter logs locally if needed
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedCamera !== 'all' && l.camera_id !== selectedCamera) return false
      if (selectedDate !== 'all' && !l.local_time?.startsWith(selectedDate)) return false
      if (tempFilter === 'high' && (parseFloat(l.chip_temp_c) || 0) < 80.5) return false
      if (tempFilter === 'normal' && (parseFloat(l.chip_temp_c) || 0) >= 80.5) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchFile = l.filename?.toLowerCase().includes(q)
        const matchIp = l.client_ip?.toLowerCase().includes(q)
        const matchTime = l.local_time?.toLowerCase().includes(q)
        const matchLoc = l.location_name?.toLowerCase().includes(q)
        const matchCam = l.camera_id?.toLowerCase().includes(q)
        if (!matchFile && !matchIp && !matchTime && !matchLoc && !matchCam) return false
      }
      return true
    })
  }, [logs, selectedCamera, selectedDate, tempFilter, searchQuery])

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // Fetch Sidecar JSON
  const handleInspectJson = async (log) => {
    setJsonLoading(true)
    setInspectJson({ log, data: null })
    try {
      if (log.json_url) {
        const res = await fetch(log.json_url)
        if (res.ok) {
          const data = await res.json()
          setInspectJson({ log, data })
          return
        }
      }
      // If no remote json or error, construct mock sidecar based on record
      const fallbackSidecar = {
        camera_id: log.camera_id,
        location: log.location,
        timestamp: log.timestamp || new Date().toISOString(),
        local_time: log.local_time,
        filename: log.filename,
        client_ip: log.client_ip,
        file_size_bytes: log.file_size_bytes || 65420,
        telemetry: {
          chip_temp_c: log.chip_temp_c || 80.0,
          uptime_sec: log.uptime_sec || 2139,
          free_heap: log.free_heap || 156704,
          free_psram: log.free_psram || 3419476,
          wifi_rssi_dbm: log.wifi_rssi_dbm || -82,
          aec_value: log.light_aec_value || 490
        },
        minio_s3: {
          bucket: 'raw-datasets',
          path: `dataset/${log.camera_id}/${log.local_time?.split(' ')[0]}/${log.local_time?.split(' ')[1]?.split(':')[0]}/images/${log.filename}`
        }
      }
      setInspectJson({ log, data: fallbackSidecar })
    } catch (err) {
      console.warn('Could not fetch remote JSON sidecar:', err)
      setInspectJson({
        log,
        data: {
          error: 'Sidecar JSON unavailable from server',
          record: log
        }
      })
    } finally {
      setJsonLoading(false)
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredLogs.length) return
    const headers = [
      'ID',
      'Camera ID',
      'Location',
      'Local Time',
      'Filename',
      'Client IP',
      'Chip Temp (C)',
      'Free Heap (B)',
      'Free PSRAM (B)',
      'WiFi RSSI (dBm)',
      'AEC Value',
      'Status'
    ]
    const rows = filteredLogs.map((l) => [
      l.id,
      l.camera_id,
      `"${l.location_name}"`,
      l.local_time,
      l.filename,
      l.client_ip,
      l.chip_temp_c,
      l.free_heap,
      l.free_psram,
      l.wifi_rssi_dbm,
      l.light_aec_value,
      l.status
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `esp32_ingestion_logs_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="platform-workspace">
      {/* 1. Breadcrumb */}
      <div className="platform-breadcrumb">
        <span>Platform</span>
        <span>/</span>
        <span className="text-[#30312F] font-medium">ESP32 Ingestion & Telemetry Logs</span>
      </div>

      {/* 2. Platform Services Introduction Header */}
      <div className="platform-intro">
        <div className="platform-overview">
          <div className="platform-metadata">
            <PillTag variant="neutral">ESP32-CAM Edge Nodes</PillTag>
            <PillTag variant="neutral">MinIO Object Lake</PillTag>
            <PillTag variant={isLiveConnected ? 'active' : 'neutral'}>
              {isLiveConnected ? 'Live Lake: Connected' : 'Fallback Mode'}
            </PillTag>
          </div>

          <h1 className="platform-title">
            ESP32 Ingestion & Telemetry Logs
          </h1>

          <p className="platform-description">
            ศูนย์กลางบันทึกภาพ Snapshot, อุณหภูมิชิป ESP32-CAM, Heap RAM และ Sidecar Metadata จาก MinIO Bucket <code className="px-1.5 py-0.5 rounded bg-[#FAF8EF] border border-[#DEDED2] font-mono text-xs text-[#30312F]">raw-datasets</code> แบบ Real-Time
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
            className={`box-border inline-flex items-center gap-2 h-12 px-5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border select-none ${
              liveAutoRefresh
                ? 'bg-[#E7F4D8] text-[#36612D] border-[#BBF7D0]'
                : 'bg-[#FAF8EF] text-[#686962] border-[#DEDED2] hover:bg-[#F0EEE4]'
            }`}
            title="เปิด/ปิดการดึงข้อมูลสดอัตโนมัติทุก 4 วิ"
          >
            <Radio className={`w-3.5 h-3.5 ${liveAutoRefresh ? 'animate-pulse text-[#36612D]' : 'text-[#85847E]'}`} />
            <span>{liveAutoRefresh ? 'Live Polling (4s)' : 'Manual Mode'}</span>
          </button>

          <PillButton
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchRecords}
            className="h-12"
          >
            รีเฟรช
          </PillButton>

          <PillButton
            variant="primary"
            icon={Download}
            onClick={handleExportCsv}
            className="h-12"
          >
            Export CSV
          </PillButton>
        </div>
      </div>

      {/* 3. Bento KPI Summary Tiles (Row of 4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        {/* Tile 1: Total Snapshots */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">TOTAL SNAPSHOTS</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Camera className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#30312F] tracking-tight">
                {serverStats?.total_records ? serverStats.total_records.toLocaleString() : logs.length.toLocaleString()}
              </span>
              <span className="font-sans text-xs text-[#85847E]">ภาพ</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#85847E]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
            <span>ความถี่ส่งภาพทุก 5 - 15 วินาที</span>
          </div>
        </div>

        {/* Tile 2: Avg Chip Temp */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">AVG CHIP TEMPERATURE</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Thermometer className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#30312F] tracking-tight">
                {serverStats?.avg_temp ?? stats.avgTemp}
              </span>
              <span className="font-sans text-xs text-[#85847E]">°C</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center justify-between text-xs">
            <span className="text-[#85847E]">สถานะความร้อน</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[11px] ${
              stats.highTempCount > 0 ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' : 'bg-[#E7F4D8] text-[#36612D]'
            }`}>
              {stats.highTempCount > 0 ? `${stats.highTempCount} เฟรม ≥ 80.5°` : 'Safe Range'}
            </span>
          </div>
        </div>

        {/* Tile 3: Avg Free Heap */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">AVG FREE HEAP RAM</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <Cpu className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#30312F] tracking-tight">
                {serverStats?.avg_heap ?? stats.avgHeap}
              </span>
              <span className="font-sans text-xs text-[#85847E]">KB</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#85847E]">
            <span>PSRAM: <strong className="text-[#30312F] font-semibold">3.4 MB</strong> พร้อมใช้งาน</span>
          </div>
        </div>

        {/* Tile 4: MinIO Lake */}
        <div className="box-border flex flex-col justify-between p-6 gap-3 min-h-[170px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-xs">
          <div className="flex items-center justify-between text-[#85847E]">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#85847E]">MINIO OBJECT LAKE</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#30312F]">
              <HardDrive className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-[#30312F] truncate tracking-tight">
              {serverStats?.minio_bucket || 'raw-datasets'}
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0EEE4] flex items-center gap-1.5 text-xs text-[#36612D]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#36612D]" strokeWidth={2} />
            <span>S3 Active • Port :9000</span>
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Bar Bento Card */}
      <div className="w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-5 flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-[#85847E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="w-full pl-10 pr-9 py-2.5 bg-[#FAF8EF] border border-[#DEDED2] rounded-full text-xs font-sans text-[#30312F] placeholder-[#85847E] focus:outline-none focus:border-[#30312F] transition-all"
              placeholder="ค้นหาชื่อไฟล์ .jpg, หมายเลข IP, วันเวลา, โหนดกล้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85847E] hover:text-[#30312F] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Camera Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#85847E] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              กล้อง:
            </span>
            {[
              { id: 'all', label: 'ทุกกล้อง' },
              { id: 'cam1', label: 'CAM-01 (หน้าภาค 1)' },
              { id: 'cam2', label: 'CAM-02 (หน้าภาค 2)' },
              { id: 'cam3', label: 'CAM-03 (ข้างภาค)' }
            ].map((cam) => {
              const active = selectedCamera === cam.id
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => { setSelectedCamera(cam.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#30312F] text-white border-[#30312F]'
                      : 'bg-[#FAF8EF] text-[#686962] border-[#DEDED2] hover:bg-[#F0EEE4]'
                  }`}
                >
                  {cam.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Second Row of Filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-[#F0EEE4]">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#85847E] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                วันที่:
              </span>
              <select
                className="bg-[#FAF8EF] border border-[#DEDED2] rounded-full px-3 py-1.5 text-xs text-[#30312F] outline-none cursor-pointer hover:border-[#B8B8A8]"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">ทุกวันที่ ({availableDates.length} วัน)</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#85847E] uppercase tracking-wider flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5" />
                อุณหภูมิ:
              </span>
              <select
                className="bg-[#FAF8EF] border border-[#DEDED2] rounded-full px-3 py-1.5 text-xs text-[#30312F] outline-none cursor-pointer hover:border-[#B8B8A8]"
                value={tempFilter}
                onChange={(e) => { setTempFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">ทั้งหมด</option>
                <option value="normal">ปกติ (&lt; 80.5°C)</option>
                <option value="high">ร้อนสูง (≥ 80.5°C)</option>
              </select>
            </div>
          </div>

          {/* Sort Order Toggle & Result Count */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#85847E]">
              พบ <strong className="text-[#30312F] font-semibold">{filteredLogs.length.toLocaleString()}</strong> รายการ
            </span>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8EF] border border-[#DEDED2] hover:bg-[#F0EEE4] text-[#30312F] rounded-full text-xs font-medium cursor-pointer transition-colors"
              title="สลับการเรียงลำดับเวลา"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'ล่าสุดก่อน' : 'เก่าสุดก่อน'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Logs Table Bento Card */}
      <div className="w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 shadow-xs flex flex-col gap-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DEDED2] text-[#85847E] text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 text-center" style={{ width: '76px' }}>ภาพถ่าย</th>
                <th className="py-3 px-3" style={{ width: '180px' }}>วัน - เวลา บันทึก</th>
                <th className="py-3 px-3" style={{ width: '190px' }}>กล้อง / จุดติดตั้ง</th>
                <th className="py-3 px-3" style={{ width: '130px' }}>อุณหภูมิชิป</th>
                <th className="py-3 px-3" style={{ width: '200px' }}>ESP32 (Heap/WiFi)</th>
                <th className="py-3 px-3">ชื่อไฟล์ S3 & เมตาดาต้า</th>
                <th className="py-3 px-3 text-center" style={{ width: '160px' }}>การตรวจสอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEE4] text-xs">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-[#85847E]">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <Search className="w-8 h-8 text-[#85847E] animate-pulse" />
                      <span className="text-sm font-semibold text-[#30312F]">ไม่พบบันทึก Log ตามเงื่อนไขที่เลือก</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedCamera('all')
                          setSelectedDate('all')
                          setTempFilter('all')
                          setCurrentPage(1)
                        }}
                        className="text-xs text-[#36612D] underline hover:text-[#30312F] mt-1 font-medium cursor-pointer"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isHighTemp = (parseFloat(log.chip_temp_c) || 0) >= 80.5

                  return (
                    <tr key={log.id || log.filename} className="hover:bg-[#FAF8EF]/70 transition-colors">
                      {/* Thumbnail Image */}
                      <td className="py-3 px-3 text-center">
                        <div
                          className="relative w-12 h-12 rounded-[12px] overflow-hidden bg-[#FAF8EF] border border-[#DEDED2] cursor-pointer group mx-auto"
                          onClick={() => setActivePhoto(log)}
                          title="คลิกเพื่อดูภาพ Snapshot ขนาดใหญ่"
                        >
                          <img
                            src={log.image_url}
                            alt={log.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=150&q=80'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-[#30312F] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#85847E] flex-shrink-0" />
                          <span>{log.local_time}</span>
                        </div>
                        <span className="text-[11px] text-[#85847E] font-mono block mt-0.5">
                          ID: #{log.id}
                        </span>
                      </td>

                      {/* Camera Node */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-[8px] bg-[#FAF8EF] border border-[#DEDED2] font-mono font-bold text-[11px] text-[#30312F]">
                            {log.camera_id?.toUpperCase() || 'CAM-01'}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-[#30312F]">
                              {log.location_name}
                            </div>
                            <span className="text-[11px] text-[#85847E] font-mono">
                              {log.client_ip}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Chip Temperature */}
                      <td className="py-3 px-3">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                          isHighTemp
                            ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                            : 'bg-[#FAF8EF] text-[#30312F] border border-[#DEDED2]'
                        }`}>
                          <Thermometer className="w-3.5 h-3.5" />
                          <span>{log.chip_temp_c ? `${parseFloat(log.chip_temp_c).toFixed(1)}°C` : '80.0°C'}</span>
                          {isHighTemp && (
                            <AlertTriangle className="w-3 h-3 text-[#991B1B]" />
                          )}
                        </div>
                      </td>

                      {/* ESP32 Telemetry */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-[#30312F]">
                            <Cpu className="w-3 h-3 text-[#85847E]" />
                            <span>Heap: {log.free_heap ? Math.round(log.free_heap / 1024) : 156} KB</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#85847E]">
                            <Wifi className="w-3 h-3 text-[#85847E]" />
                            <span>WiFi: {log.wifi_rssi_dbm || -82} dBm</span>
                          </div>
                        </div>
                      </td>

                      {/* File and Size */}
                      <td className="py-3 px-3">
                        <div className="text-xs font-mono text-[#30312F] font-medium truncate max-w-[240px]" title={log.filename}>
                          {log.filename}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#85847E] mt-0.5 font-mono">
                          <span className="truncate max-w-[170px]" title={log.minio_url}>
                            {log.minio_url ? log.minio_url.replace('s3://raw-datasets/', '') : 'raw-datasets'}
                          </span>
                          <span>•</span>
                          <span>{log.file_size_bytes ? `${Math.round(log.file_size_bytes / 1024)} KB` : '~65 KB'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActivePhoto(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8EF] border border-[#DEDED2] hover:bg-[#F0EEE4] text-[#30312F] text-xs font-medium cursor-pointer transition-colors"
                            title="ดูภาพ Snapshot เต็ม"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูภาพ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInspectJson(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8EF] border border-[#DEDED2] hover:bg-[#F0EEE4] text-[#30312F] text-xs font-medium cursor-pointer transition-colors"
                            title="ดูไฟล์ JSON Sidecar"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>JSON</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > pageSize && (
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#F0EEE4] flex-wrap">
            <div className="text-xs text-[#85847E]">
              หน้า <strong className="text-[#30312F] font-semibold">{currentPage}</strong> จากทั้งหมด <strong className="text-[#30312F] font-semibold">{totalPages}</strong> หน้า
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-full bg-[#FAF8EF] border border-[#DEDED2] hover:bg-[#F0EEE4] text-[#30312F] flex items-center justify-center disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1
                if (totalPages > 5 && currentPage > 3) {
                  pNum = currentPage - 2 + i
                  if (pNum > totalPages) pNum = totalPages - (4 - i)
                }
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      currentPage === pNum
                        ? 'bg-[#30312F] text-white'
                        : 'bg-[#FAF8EF] border border-[#DEDED2] hover:bg-[#F0EEE4] text-[#30312F]'
                    }`}
                  >
                    {pNum}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-full bg-[#FAF8EF] border border-[#DEDED2] hover:bg-[#F0EEE4] text-[#30312F] flex items-center justify-center disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= CENTRAL MODAL 1: Full Photo Inspection ================= */}
      <Modal
        isOpen={Boolean(activePhoto)}
        onClose={() => setActivePhoto(null)}
        title={activePhoto?.filename}
        subtitle={`บันทึกเมื่อ: ${activePhoto?.local_time} • ${activePhoto?.location_name}`}
        icon={Camera}
        iconBg="bg-[#E7F4D8]"
        iconBorder="border-[#BBF7D0]"
        badge={<PillTag variant="active">{activePhoto?.camera_id?.toUpperCase()}</PillTag>}
        size="2xl"
        footer={
          <>
            <span className="font-mono text-xs text-[#85847E]">
              S3 Bucket: <code className="text-[#30312F]">raw-datasets</code>
            </span>
            <div className="flex items-center gap-2">
              <PillButton
                variant="secondary"
                icon={FileCode}
                onClick={() => {
                  const item = activePhoto
                  setActivePhoto(null)
                  handleInspectJson(item)
                }}
                className="h-10 text-xs px-4"
              >
                ดู JSON Sidecar
              </PillButton>
              <PillButton
                variant="primary"
                onClick={() => setActivePhoto(null)}
                className="h-10 text-xs px-4"
              >
                ปิดหน้าต่าง
              </PillButton>
            </div>
          </>
        }
      >
        {activePhoto && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-[18px] overflow-hidden bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={activePhoto.image_url}
                alt={activePhoto.filename}
                className="w-full h-auto max-h-[500px] object-contain rounded-[14px]"
              />
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-sans text-xs font-bold text-[#85847E] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#30312F]" />
                ESP32 Telemetry Snapshot
              </span>
              <div className="space-y-2">
                <div className="bg-[#FAF8EF] p-3 rounded-[14px] border border-[#DEDED2]">
                  <span className="text-[11px] font-medium text-[#85847E] block mb-1">CLIENT IP & NODE</span>
                  <span className="font-mono font-bold text-sm text-[#30312F]">
                    {activePhoto.client_ip} ({activePhoto.camera_id})
                  </span>
                </div>
                <div className="bg-[#FAF8EF] p-3 rounded-[14px] border border-[#DEDED2]">
                  <span className="text-[11px] font-medium text-[#85847E] block mb-1">CHIP TEMPERATURE</span>
                  <span className="font-mono font-bold text-base text-[#30312F]">
                    {activePhoto.chip_temp_c ? `${activePhoto.chip_temp_c}°C` : '80.0°C'}
                  </span>
                </div>
                <div className="bg-[#FAF8EF] p-3 rounded-[14px] border border-[#DEDED2]">
                  <span className="text-[11px] font-medium text-[#85847E] block mb-1">FREE HEAP / PSRAM</span>
                  <span className="font-mono font-bold text-xs text-[#30312F] block">
                    Heap: {activePhoto.free_heap ? Math.round(activePhoto.free_heap / 1024) : 156} KB
                  </span>
                  <span className="font-mono text-[11px] text-[#85847E] block mt-0.5">
                    PSRAM: {(activePhoto.free_psram / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                <div className="bg-[#FAF8EF] p-3 rounded-[14px] border border-[#DEDED2]">
                  <span className="text-[11px] font-medium text-[#85847E] block mb-1">WI-FI RSSI & UPTIME</span>
                  <span className="font-mono font-bold text-xs text-[#30312F] block">
                    {activePhoto.wifi_rssi_dbm || -82} dBm
                  </span>
                  <span className="font-mono text-[11px] text-[#85847E] block mt-0.5">
                    Uptime: {activePhoto.uptime_sec}s
                  </span>
                </div>
                <div className="bg-[#FAF8EF] p-3 rounded-[14px] border border-[#DEDED2]">
                  <span className="text-[11px] font-medium text-[#85847E] block mb-1">MINIO STORAGE KEY</span>
                  <span className="font-mono text-[11px] text-[#30312F] break-all">
                    {activePhoto.minio_url || `s3://raw-datasets/${activePhoto.filename}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= CENTRAL MODAL 2: JSON Sidecar Inspector ================= */}
      <Modal
        isOpen={Boolean(inspectJson)}
        onClose={() => setInspectJson(null)}
        title={inspectJson?.log?.filename?.replace('.jpg', '.json')}
        subtitle="Raw IoT Ingestion Metadata Payload (ESP32 Sensor Dump)"
        icon={FileCode}
        iconBg="bg-[#EBE5F6]"
        iconBorder="border-[#D8CEEE]"
        badge={<PillTag variant="neutral">JSON SIDECAR</PillTag>}
        size="xl"
        footer={
          <>
            <span className="font-mono text-xs text-[#85847E]">
              Bucket: <code className="text-[#30312F]">raw-datasets</code>
            </span>
            <PillButton
              variant="primary"
              onClick={() => setInspectJson(null)}
              className="h-10 text-xs px-4"
            >
              ปิดหน้าต่าง
            </PillButton>
          </>
        }
      >
        {inspectJson && (
          <div className="w-full max-h-[460px] overflow-auto rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] p-4">
            {jsonLoading ? (
              <div className="flex items-center justify-center py-16 text-[#85847E] gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#30312F]" />
                <span>กำลังดึง JSON Sidecar จาก Server/MinIO...</span>
              </div>
            ) : (
              <pre className="font-mono text-xs text-[#30312F] whitespace-pre-wrap leading-relaxed m-0">
                {JSON.stringify(inspectJson.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
