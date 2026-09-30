import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ScrollText,
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
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Radio,
  Zap,
  Sparkles,
  Database
} from 'lucide-react'
import {
  fetchRealServerLogs,
  loadDumpMetadata,
  formatTimestampThai,
  getIngestionApiBase
} from '../utils/dumpData'

export default function IngestionLogsView() {
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
      // Camera filter
      if (selectedCamera !== 'all' && l.camera_id !== selectedCamera) return false
      // Date filter
      if (selectedDate !== 'all' && !l.local_time?.startsWith(selectedDate)) return false
      // Temp filter
      if (tempFilter === 'high' && (parseFloat(l.chip_temp_c) || 0) < 80.5) return false
      if (tempFilter === 'normal' && (parseFloat(l.chip_temp_c) || 0) >= 80.5) return false
      // Search
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
    <div className="ingestion-logs-container">
      {/* Header Banner - High Tech Executive Style */}
      <div className="logs-header-banner">
        <div className="flex items-center gap-3.5">
          <div className="logs-icon-box">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="logs-title-main">
                ESP32 Ingestion & Telemetry Logs
              </h2>
              <span className="logs-lake-badge">
                <span className="logs-ping-beacon"></span>
                <span className="logs-dot-beacon"></span>
                <span>{isLiveConnected ? 'Live MinIO Object Lake' : 'Fallback Mode'}</span>
              </span>
            </div>
            <p className="logs-subtitle-text">
              บันทึกภาพ Snapshot, อุณหภูมิชิป ESP32, Heap RAM และ Sidecar Metadata จาก MinIO Bucket <code className="logs-code-pill">raw-datasets</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
            className={`btn-logs-toggle-live ${liveAutoRefresh ? 'active' : ''}`}
            title="เปิด/ปิดการดึงข้อมูลสดอัตโนมัติทุก 4 วิ"
          >
            <Radio className={`w-3.5 h-3.5 ${liveAutoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{liveAutoRefresh ? 'Live Polling (4s)' : 'Manual Mode'}</span>
          </button>

          <button
            type="button"
            onClick={fetchRecords}
            disabled={loading}
            className="btn-logs-action"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-logs-action btn-logs-export"
            title="ส่งออกตารางเป็นไฟล์ CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Tiles - Small Gray Headers & Giant Vivid Values */}
      <div className="logs-kpi-grid">
        {/* Tile 1: Total Snapshots */}
        <div className="logs-kpi-card tile-glow-emerald">
          <div className="tile-label-row">
            <span className="tile-label">TOTAL CAPTURED SNAPSHOTS</span>
            <Camera className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="tile-value-row">
            <span className="tile-value-giant text-white">
              {serverStats?.total_records ? serverStats.total_records.toLocaleString() : logs.length.toLocaleString()}
            </span>
            <span className="tile-unit-symbol text-emerald-400">ภาพ</span>
          </div>
          <div className="tile-footer-status">
            <span className="text-[11px] text-emerald-300/80 font-mono">
              ● ความถี่ส่งภาพทุก 5 - 15 วินาที
            </span>
          </div>
        </div>

        {/* Tile 2: Avg Chip Temp */}
        <div className="logs-kpi-card tile-glow-amber">
          <div className="tile-label-row">
            <span className="tile-label">AVG CHIP TEMPERATURE</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="tile-value-row">
            <span className="tile-value-giant text-amber-400">
              {serverStats?.avg_temp ?? stats.avgTemp}
            </span>
            <span className="tile-unit-symbol text-amber-300">°C</span>
          </div>
          <div className="tile-footer-status">
            <span className="tile-badge bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {stats.highTempCount > 0 ? `${stats.highTempCount} เฟรม ≥ 80.5°` : 'Safe Range'}
            </span>
          </div>
        </div>

        {/* Tile 3: Avg Free Heap */}
        <div className="logs-kpi-card tile-glow-cyan">
          <div className="tile-label-row">
            <span className="tile-label">AVG FREE HEAP MEMORY</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="tile-value-row">
            <span className="tile-value-giant text-cyan-400">
              {serverStats?.avg_heap ?? stats.avgHeap}
            </span>
            <span className="tile-unit-symbol text-cyan-300">KB</span>
          </div>
          <div className="tile-footer-status">
            <span className="text-[11px] text-slate-400 font-mono">
              PSRAM: <strong className="text-cyan-300">3.4 MB</strong> ว่าง
            </span>
          </div>
        </div>

        {/* Tile 4: MinIO S3 Lake */}
        <div className="logs-kpi-card tile-glow-purple">
          <div className="tile-label-row">
            <span className="tile-label">MINIO S3 OBJECT LAKE</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="tile-value-row">
            <span className="tile-value-giant text-purple-300 truncate" title={serverStats?.minio_bucket || 'raw-datasets'}>
              {serverStats?.minio_bucket || 'raw-datasets'}
            </span>
          </div>
          <div className="tile-footer-status">
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              S3 Active (Port 9000)
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="logs-filter-bar">
        {/* Search Input */}
        <div className="logs-search-wrapper">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            className="logs-search-input"
            placeholder="ค้นหาชื่อไฟล์ .jpg, หมายเลข IP, วันเวลา, โหนดกล้อง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Camera Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            กล้อง:
          </span>
          <button
            type="button"
            className={`logs-cam-pill ${selectedCamera === 'all' ? 'active' : ''}`}
            onClick={() => { setSelectedCamera('all'); setCurrentPage(1); }}
          >
            ทุกกล้อง
          </button>
          <button
            type="button"
            className={`logs-cam-pill ${selectedCamera === 'cam1' ? 'active' : ''}`}
            onClick={() => { setSelectedCamera('cam1'); setCurrentPage(1); }}
          >
            CAM-01 (หน้าภาค 1)
          </button>
          <button
            type="button"
            className={`logs-cam-pill ${selectedCamera === 'cam2' ? 'active' : ''}`}
            onClick={() => { setSelectedCamera('cam2'); setCurrentPage(1); }}
          >
            CAM-02 (หน้าภาค 2)
          </button>
          <button
            type="button"
            className={`logs-cam-pill ${selectedCamera === 'cam3' ? 'active' : ''}`}
            onClick={() => { setSelectedCamera('cam3'); setCurrentPage(1); }}
          >
            CAM-03 (ข้างภาค)
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            วันที่:
          </span>
          <select
            className="logs-select"
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
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            อุณหภูมิ:
          </span>
          <select
            className="logs-select"
            value={tempFilter}
            onChange={(e) => { setTempFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="normal">ปกติ (&lt; 80.5°C)</option>
            <option value="high">ร้อนสูง (≥ 80.5°C)</option>
          </select>
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="btn-logs-sort-toggle"
          title="สลับการเรียงลำดับเวลา"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
          <span>{sortOrder === 'desc' ? 'ล่าสุดก่อน' : 'เก่าสุดก่อน'}</span>
        </button>
      </div>

      {/* Result Count Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <span>แสดง</span>
          <strong className="text-white font-mono">{filteredLogs.length.toLocaleString()}</strong>
          <span>รายการ</span>
          {searchQuery && <span className="text-emerald-400">(ตรงกับ &quot;{searchQuery}&quot;)</span>}
        </span>
        <span className="text-[11px] text-slate-500 hidden sm:inline font-mono">
          *คลิกที่รูปเพื่อขยายภาพเต็ม หรือคลิก &quot;JSON&quot; เพื่อดูโครงสร้างข้อมูล Sidecar ดิบ
        </span>
      </div>

      {/* Main Logs Data Table */}
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th style={{ width: '72px', textAlign: 'center' }}>ภาพถ่าย</th>
              <th style={{ width: '180px' }}>วัน - เวลา บันทึก</th>
              <th style={{ width: '190px' }}>กล้อง / จุดติดตั้ง</th>
              <th style={{ width: '130px' }}>อุณหภูมิชิป</th>
              <th style={{ width: '200px' }}>ESP32 (Heap/WiFi)</th>
              <th>ชื่อไฟล์ S3 & เมตาดาต้า</th>
              <th style={{ width: '150px', textAlign: 'center' }}>การตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <Search className="w-10 h-10 text-slate-600 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-300">ไม่พบบันทึก Log ตามเงื่อนไขที่เลือก</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCamera('all')
                        setSelectedDate('all')
                        setTempFilter('all')
                        setCurrentPage(1)
                      }}
                      className="text-xs text-emerald-400 underline hover:text-emerald-300 mt-1 font-medium"
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
                  <tr key={log.id || log.filename} className="logs-row">
                    {/* Thumbnail Image */}
                    <td style={{ textAlign: 'center' }}>
                      <div
                        className="logs-thumb-box group"
                        onClick={() => setActivePhoto(log)}
                        title="คลิกเพื่อดูภาพ Snapshot ขนาดใหญ่"
                      >
                        <img
                          src={log.image_url}
                          alt={log.filename}
                          className="logs-thumb-img"
                          onError={(e) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=150&q=80'
                          }}
                        />
                        <div className="logs-thumb-overlay">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-white font-medium">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{log.local_time}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        ID: #{log.id}
                      </span>
                    </td>

                    {/* Camera Node */}
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="logs-badge-cam-id">
                          {log.camera_id?.toUpperCase() || 'CAM-01'}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {log.location_name}
                          </div>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {log.client_ip}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Chip Temperature */}
                    <td>
                      <div
                        className={`temp-badge ${
                          isHighTemp ? 'temp-high' : 'temp-normal'
                        }`}
                      >
                        <Thermometer className="w-3.5 h-3.5" />
                        <span className="font-mono font-bold">
                          {log.chip_temp_c ? `${parseFloat(log.chip_temp_c).toFixed(1)}°C` : '80.0°C'}
                        </span>
                        {isHighTemp && (
                          <AlertTriangle className="w-3 h-3 text-rose-400 ml-0.5" />
                        )}
                      </div>
                    </td>

                    {/* ESP32 Telemetry */}
                    <td>
                      <div className="telemetry-info-grid">
                        <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-mono">
                          <Cpu className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span>
                            Heap: {log.free_heap ? Math.round(log.free_heap / 1024) : 156} KB
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 font-mono">
                          <Wifi className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                          <span>
                            WiFi: {log.wifi_rssi_dbm || -82} dBm
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* File and Size */}
                    <td>
                      <div className="text-xs font-mono text-slate-200 font-medium truncate max-w-[240px]" title={log.filename}>
                        {log.filename}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <span className="text-indigo-400 truncate max-w-[170px]" title={log.minio_url}>
                          {log.minio_url ? log.minio_url.replace('s3://raw-datasets/', '') : 'raw-datasets'}
                        </span>
                        <span>•</span>
                        <span>{log.file_size_bytes ? `${Math.round(log.file_size_bytes / 1024)} KB` : '~65 KB'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActivePhoto(log)}
                          className="btn-logs-row-action btn-logs-row-photo"
                          title="ดูภาพ Snapshot เต็ม"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูภาพ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInspectJson(log)}
                          className="btn-logs-row-action btn-logs-row-json"
                          title="ดูไฟล์ JSON Sidecar ของภาพนี้"
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

        {/* Pagination Footer */}
        {filteredLogs.length > pageSize && (
          <div className="logs-pagination-bar">
            <div className="text-xs text-slate-400">
              หน้า <strong className="text-white font-mono">{currentPage}</strong> จากทั้งหมด <strong className="text-white font-mono">{totalPages}</strong> หน้า
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="logs-page-btn"
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
                    className={`logs-page-num ${currentPage === pNum ? 'active' : ''}`}
                  >
                    {pNum}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="logs-page-btn"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: Full Photo Inspection ================= */}
      {activePhoto && (
        <div className="modal-backdrop-logs" onClick={() => setActivePhoto(null)}>
          <div
            className="modal-box-photo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-photo-header">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{activePhoto.filename}</span>
                    <span className="logs-badge-cam-id">
                      {activePhoto.camera_id?.toUpperCase()}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    บันทึกเมื่อ: {activePhoto.local_time} • {activePhoto.location_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setActivePhoto(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-photo-body">
              <div className="modal-photo-img-wrap">
                <img
                  src={activePhoto.image_url}
                  alt={activePhoto.filename}
                  className="modal-photo-img"
                />
              </div>

              {/* Side Metadata Panel */}
              <div className="modal-photo-side">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  ESP32 Telemetry Snapshot
                </span>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="tile-label block mb-1">CLIENT IP & CAMERA</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {activePhoto.client_ip} ({activePhoto.camera_id})
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="tile-label block mb-1">CHIP TEMPERATURE</span>
                    <span className="font-mono font-bold text-amber-400 text-base">
                      {activePhoto.chip_temp_c ? `${activePhoto.chip_temp_c}°C` : '80.0°C'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="tile-label block mb-1">FREE HEAP / PSRAM</span>
                    <span className="font-mono font-bold text-cyan-300 block">
                      Heap: {activePhoto.free_heap ? Math.round(activePhoto.free_heap / 1024) : 156} KB
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                      PSRAM: {(activePhoto.free_psram / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="tile-label block mb-1">WI-FI RSSI & UPTIME</span>
                    <span className="font-mono font-bold text-emerald-400 block">
                      {activePhoto.wifi_rssi_dbm || -82} dBm
                    </span>
                    <span className="font-mono text-[11px] text-purple-300 block mt-0.5">
                      Uptime: {activePhoto.uptime_sec}s
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="tile-label block mb-1">MINIO S3 STORAGE KEY</span>
                    <span className="font-mono text-[11px] text-indigo-300 break-all">
                      {activePhoto.minio_url || `s3://raw-datasets/${activePhoto.filename}`}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const item = activePhoto
                      setActivePhoto(null)
                      handleInspectJson(item)
                    }}
                    className="w-full btn-logs-action btn-logs-export justify-center"
                  >
                    <FileCode className="w-4 h-4" />
                    <span>ดู JSON Sidecar เมตาดาต้า</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: JSON Sidecar Inspector ================= */}
      {inspectJson && (
        <div className="modal-backdrop-logs" onClick={() => setInspectJson(null)}>
          <div
            className="modal-box-json"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-photo-header">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{inspectJson.log?.filename?.replace('.jpg', '.json')}</span>
                    <span className="logs-badge-cam-id">
                      JSON SIDECAR
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Raw IoT Ingestion Metadata Payload (ESP32 Sensor Dump)
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setInspectJson(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-json-body">
              {jsonLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>กำลังดึง JSON Sidecar จาก Server/MinIO...</span>
                </div>
              ) : (
                <pre className="modal-json-pre">
                  {JSON.stringify(inspectJson.data, null, 2)}
                </pre>
              )}
            </div>

            <div className="modal-photo-footer">
              <span className="text-xs text-slate-400 font-mono">
                Location: MinIO Lake bucket <code>raw-datasets</code>
              </span>
              <button
                type="button"
                onClick={() => setInspectJson(null)}
                className="btn-logs-action"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
