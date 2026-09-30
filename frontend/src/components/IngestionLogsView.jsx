import React, { useState, useEffect, useMemo } from 'react'
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  Camera,
  Thermometer,
  Wifi,
  HardDrive,
  Cpu,
  Eye,
  FileCode,
  Download,
  RefreshCw,
  ExternalLink,
  X,
  Copy,
  Check,
  Clock,
  Layers,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { loadDumpMetadata, FALLBACK_DUMP_RECORDS } from '../utils/dumpData'

export default function IngestionLogsView({ onNavigate }) {
  const [logs, setLogs] = useState(FALLBACK_DUMP_RECORDS)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCamera, setSelectedCamera] = useState('all')
  const [selectedDate, setSelectedDate] = useState('all')
  const [tempFilter, setTempFilter] = useState('all') // 'all', 'high' (>=80.5), 'normal' (<80.5)
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' (latest first), 'asc'

  // Modal inspection states
  const [activePhoto, setActivePhoto] = useState(null)
  const [activeJson, setActiveJson] = useState(null)
  const [loadingJson, setLoadingJson] = useState(false)
  const [copied, setCopied] = useState(false)
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(false)

  // Load records from metadata.json
  const fetchRecords = async () => {
    setLoading(true)
    try {
      const records = await loadDumpMetadata()
      setLogs(records)
    } catch (err) {
      console.warn('Failed to load dump metadata, using fallback:', err)
      setLogs(FALLBACK_DUMP_RECORDS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  // Auto-refresh interval if enabled
  useEffect(() => {
    if (!liveAutoRefresh) return
    const timer = setInterval(() => {
      fetchRecords()
    }, 5000)
    return () => clearInterval(timer)
  }, [liveAutoRefresh])

  // Extract available dates for filter dropdown
  const availableDates = useMemo(() => {
    const set = new Set()
    logs.forEach((log) => {
      if (log.local_time) {
        const datePart = log.local_time.split(' ')[0]
        if (datePart) set.add(datePart)
      }
    })
    return Array.from(set).sort().reverse()
  }, [logs])

  // Filtered & sorted logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Camera filter
        if (selectedCamera !== 'all' && log.camera_id !== selectedCamera) {
          return false
        }
        // Date filter
        if (selectedDate !== 'all' && !log.local_time.startsWith(selectedDate)) {
          return false
        }
        // Temperature filter
        if (tempFilter === 'high' && log.chip_temp_c < 80.5) return false
        if (tempFilter === 'normal' && log.chip_temp_c >= 80.5) return false

        // Search query (filename, IP, local_time, location)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matches =
            log.filename?.toLowerCase().includes(q) ||
            log.client_ip?.toLowerCase().includes(q) ||
            log.local_time?.toLowerCase().includes(q) ||
            log.location_name?.toLowerCase().includes(q) ||
            log.camera_id?.toLowerCase().includes(q)
          if (!matches) return false
        }
        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || a.local_time).getTime()
        const timeB = new Date(b.timestamp || b.local_time).getTime()
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
  }, [logs, selectedCamera, selectedDate, tempFilter, searchQuery, sortOrder])

  // Summary statistics
  const stats = useMemo(() => {
    const total = logs.length
    if (total === 0) return { avgTemp: 0, highTempCount: 0, avgHeap: 0 }
    const sumTemp = logs.reduce((acc, curr) => acc + (curr.chip_temp_c || 0), 0)
    const highTemp = logs.filter((l) => (l.chip_temp_c || 0) >= 80.5).length
    const sumHeap = logs.reduce((acc, curr) => acc + (curr.free_heap || 0), 0)
    return {
      avgTemp: (sumTemp / total).toFixed(1),
      highTempCount: highTemp,
      avgHeap: Math.round(sumHeap / total / 1024)
    }
  }, [logs])

  // Fetch full sidecar JSON when clicking view JSON
  const handleInspectJson = async (record) => {
    setLoadingJson(true)
    setActiveJson({ record, data: null })
    setCopied(false)

    try {
      // Look up sidecar json in /dump_data/json_sidecar/<name>.json
      const jsonFileName = record.filename.replace(/\.jpe?g$/i, '.json')
      const res = await fetch(`/dump_data/json_sidecar/${jsonFileName}`)
      if (res.ok) {
        const jsonData = await res.json()
        setActiveJson({ record, data: jsonData })
      } else {
        // Fallback: format synthetic record object
        setActiveJson({
          record,
          data: {
            camera_id: record.camera_id,
            location: record.location,
            location_name: record.location_name,
            timestamp: record.timestamp,
            local_time: record.local_time,
            filename: record.filename,
            client_ip: record.client_ip,
            telemetry: {
              chip_temp_c: record.chip_temp_c,
              uptime_sec: record.uptime_sec,
              free_heap: record.free_heap,
              free_psram: record.free_psram,
              wifi_rssi_dbm: record.wifi_rssi_dbm,
              light_aec_value: record.light_aec_value
            }
          }
        })
      }
    } catch {
      setActiveJson({ record, data: record })
    } finally {
      setLoadingJson(false)
    }
  }

  const handleCopyJson = () => {
    if (!activeJson?.data) return
    navigator.clipboard.writeText(JSON.stringify(activeJson.data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Export filtered logs to CSV
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Camera ID',
      'Location',
      'Local Time',
      'Filename',
      'Client IP',
      'Chip Temp (C)',
      'Free Heap (Bytes)',
      'Free PSRAM (Bytes)',
      'WiFi RSSI (dBm)',
      'AEC Light Value',
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
      {/* Header Banner */}
      <div className="logs-header-banner">
        <div className="flex items-center gap-3">
          <div className="logs-icon-box">
            <ScrollText className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span>ESP32 Ingestion & Telemetry Logs</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Dump Records (5s Interval)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ประวัติการส่งภาพ Snapshot, อุณหภูมิชิป ESP32, ค่าหน่วยความจำ และ Sidecar Metadata จากกล้องทุกตัว
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
            className={`btn-filter-chip ${liveAutoRefresh ? 'active' : ''}`}
            title="เปิด/ปิดการดึงข้อมูลสดอัตโนมัติทุก 5 วิ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${liveAutoRefresh ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{liveAutoRefresh ? 'Auto-Polling (5s)' : 'Manual Mode'}</span>
          </button>

          <button
            type="button"
            onClick={fetchRecords}
            disabled={loading}
            className="btn-logs-action"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Summary KPI Cards */}
      <div className="logs-kpi-grid">
        <div className="logs-kpi-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>ภาพ Snapshot ทั้งหมด</span>
            <Camera className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{logs.length}</span>
            <span className="text-xs text-slate-400">ภาพ (Captured)</span>
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">ความถี่ส่งภาพทุก 5 วินาที</span>
        </div>

        <div className="logs-kpi-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>อุณหภูมิชิปเฉลี่ย (ESP32)</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">{stats.avgTemp}°C</span>
            <span className="text-xs text-slate-400">
              ({stats.highTempCount > 0 ? `${stats.highTempCount} เฟรม ≥ 80.5°` : 'Safe Range'})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">วัดจาก Internal Temp Sensor</span>
        </div>

        <div className="logs-kpi-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Free Heap โดยเฉลี่ย</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-300">{stats.avgHeap} KB</span>
            <span className="text-xs text-slate-400">/ 3.4 MB PSRAM</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">หน่วยความจำว่างสำหรับประมวลผล</span>
        </div>

        <div className="logs-kpi-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>ปลายทาง MinIO Storage</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold font-mono text-indigo-300 truncate">raw-datasets</span>
            <span className="text-xs text-slate-400">Bucket</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono truncate">
            localhost:9000 (Console: 9001)
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="logs-filter-bar">
        {/* Search Input */}
        <div className="logs-search-wrapper">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="logs-search-input"
            placeholder="ค้นหาชื่อไฟล์ .jpg, หมายเลข IP, วันเวลา..."
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

        {/* Camera Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Camera className="w-3.5 h-3.5" />
            กล้อง:
          </span>
          <button
            type="button"
            className={`btn-filter-pill ${selectedCamera === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCamera('all')}
          >
            ทุกกล้อง
          </button>
          <button
            type="button"
            className={`btn-filter-pill ${selectedCamera === 'cam1' ? 'active' : ''}`}
            onClick={() => setSelectedCamera('cam1')}
          >
            CAM-01 (หน้าภาค)
          </button>
          <button
            type="button"
            className={`btn-filter-pill ${selectedCamera === 'cam2' ? 'active' : ''}`}
            onClick={() => setSelectedCamera('cam2')}
          >
            CAM-02 (ในร่ม)
          </button>
          <button
            type="button"
            className={`btn-filter-pill ${selectedCamera === 'cam3' ? 'active' : ''}`}
            onClick={() => setSelectedCamera('cam3')}
          >
            CAM-03 (หลังภาค)
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            วันที่:
          </span>
          <select
            className="logs-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
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
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5" />
            อุณหภูมิ:
          </span>
          <select
            className="logs-select"
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value)}
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
          className="btn-filter-chip"
          title="สลับการเรียงลำดับเวลา"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{sortOrder === 'desc' ? 'ล่าสุดก่อน' : 'เก่าสุดก่อน'}</span>
        </button>
      </div>

      {/* Result Count Status */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          แสดงผล <strong>{filteredLogs.length}</strong> จากทั้งหมด {logs.length} รายการ
          {searchQuery && ` (ตรงกับ "${searchQuery}")`}
        </span>
        <span className="text-[11px] text-slate-500">
          *คลิกที่รูปเพื่อขยายดูภาพเต็ม หรือคลิก &quot;JSON&quot; เพื่อดูโครงสร้างข้อมูลดิบ
        </span>
      </div>

      {/* Main Logs Table */}
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th style={{ width: '70px', textAlign: 'center' }}>ภาพ</th>
              <th style={{ width: '170px' }}>วัน - เวลา</th>
              <th style={{ width: '180px' }}>กล้อง / จุดติดตั้ง</th>
              <th style={{ width: '130px' }}>อุณหภูมิชิป</th>
              <th style={{ width: '200px' }}>สถานะ ESP32 (Heap/WiFi)</th>
              <th>ชื่อไฟล์ & ขนาด</th>
              <th style={{ width: '140px', textAlign: 'center' }}>การตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 text-slate-600" />
                    <span className="text-sm font-medium">ไม่พบบันทึก Log ตามเงื่อนไขที่ค้นหา</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCamera('all')
                        setSelectedDate('all')
                        setTempFilter('all')
                      }}
                      className="text-xs text-emerald-400 underline hover:text-emerald-300 mt-1"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isHighTemp = (log.chip_temp_c || 0) >= 80.5

                return (
                  <tr key={log.id || log.filename} className="logs-row">
                    {/* Thumbnail Image */}
                    <td style={{ textAlign: 'center' }}>
                      <div
                        className="logs-thumb-box"
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
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
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
                        <span className="badge-cam-id">
                          {log.camera_id?.toUpperCase() || 'CAM-01'}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {log.location_name}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            IP: {log.client_ip}
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
                          {log.chip_temp_c ? `${log.chip_temp_c}°C` : 'N/A'}
                        </span>
                        {isHighTemp && (
                          <AlertTriangle className="w-3 h-3 text-rose-400 ml-0.5" />
                        )}
                      </div>
                    </td>

                    {/* ESP32 Telemetry */}
                    <td>
                      <div className="telemetry-info-grid">
                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                          <Cpu className="w-3 h-3 text-cyan-400" />
                          <span className="font-mono">
                            Heap: {log.free_heap ? Math.round(log.free_heap / 1024) : 156} KB
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Wifi className="w-3 h-3 text-indigo-400" />
                          <span className="font-mono">
                            WiFi: {log.wifi_rssi_dbm || -82} dBm
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* File and Size */}
                    <td>
                      <div className="text-xs font-mono text-slate-300 truncate max-w-[220px]" title={log.filename}>
                        {log.filename}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>MinIO s3://raw-datasets</span>
                        <span>•</span>
                        <span>~255 KB</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActivePhoto(log)}
                          className="btn-table-action"
                          title="ดูภาพ Snapshot เต็ม"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ดูภาพ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInspectJson(log)}
                          className="btn-table-action"
                          title="ดูไฟล์ JSON Sidecar ของภาพนี้"
                        >
                          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
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

      {/* ================= MODAL 1: Full Photo Inspection ================= */}
      {activePhoto && (
        <div className="modal-backdrop-logs" onClick={() => setActivePhoto(null)}>
          <div
            className="modal-box-photo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-photo-header">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{activePhoto.filename}</span>
                    <span className="badge-cam-id">
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
                onClick={() => setActivePhoto(null)}
                className="btn-close-modal"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="modal-photo-body">
              <div className="photo-preview-wrapper">
                <img
                  src={activePhoto.image_url}
                  alt={activePhoto.filename}
                  className="photo-large-view"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80'
                  }}
                />
              </div>

              {/* Side Metadata Card */}
              <div className="photo-meta-sidebar">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  ESP32 Telemetry Snapshot
                </h4>

                <div className="meta-info-list">
                  <div className="meta-info-row">
                    <span className="text-slate-400">จุดติดตั้ง:</span>
                    <span className="text-slate-200 font-semibold">{activePhoto.location_name}</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">กล้อง / ID:</span>
                    <span className="font-mono text-cyan-300">
                      {activePhoto.camera_id?.toUpperCase()} (#{activePhoto.id})
                    </span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">วันและเวลา:</span>
                    <span className="font-mono text-emerald-400">{activePhoto.local_time}</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">อุณหภูมิชิป:</span>
                    <span
                      className={`font-mono font-bold ${
                        (activePhoto.chip_temp_c || 0) >= 80.5 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {activePhoto.chip_temp_c}°C
                    </span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">Free Heap:</span>
                    <span className="font-mono text-slate-200">
                      {activePhoto.free_heap} Bytes (~{Math.round(activePhoto.free_heap / 1024)} KB)
                    </span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">Free PSRAM:</span>
                    <span className="font-mono text-slate-200">
                      {activePhoto.free_psram ? `${(activePhoto.free_psram / 1024 / 1024).toFixed(2)} MB` : '3.4 MB'}
                    </span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">WiFi RSSI:</span>
                    <span className="font-mono text-indigo-300">{activePhoto.wifi_rssi_dbm || -82} dBm</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">IP Address:</span>
                    <span className="font-mono text-slate-300">{activePhoto.client_ip}</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="text-slate-400">Uptime:</span>
                    <span className="font-mono text-slate-300">
                      {Math.floor(activePhoto.uptime_sec / 60)}m {activePhoto.uptime_sec % 60}s
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePhoto(null)
                      handleInspectJson(activePhoto)
                    }}
                    className="btn-view-sidecar-json"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>เปิดดู Sidecar JSON ของภาพนี้</span>
                  </button>
                  <a
                    href={activePhoto.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-open-raw-link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดภาพเต็มในแท็บใหม่</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: JSON Sidecar Inspector ================= */}
      {activeJson && (
        <div className="modal-backdrop-logs" onClick={() => setActiveJson(null)}>
          <div
            className="modal-box-json"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-json-header">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>
                      {activeJson.record?.filename.replace(/\.jpe?g$/i, '.json')}
                    </span>
                    <span className="text-[11px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                      ESP32 Sidecar JSON
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    พิกัดและข้อมูลตรวจวัดควบคู่กับภาพ Snapshot
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="btn-copy-json"
                  title="คัดลอก JSON ทั้งหมด"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอก JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveJson(null)}
                  className="btn-close-modal"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="modal-json-body">
              {loadingJson ? (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>กำลังดึงข้อมูล JSON Sidecar จากเซิร์ฟเวอร์...</span>
                </div>
              ) : (
                <pre className="json-code-block">
                  <code>{JSON.stringify(activeJson.data, null, 2)}</code>
                </pre>
              )}
            </div>

            <div className="modal-json-footer">
              <div className="text-xs text-slate-400">
                ไฟล์ถูกบันทึกที่: <code>dump_data/json_sidecar/{activeJson.record?.filename.replace(/\.jpe?g$/i, '.json')}</code>
              </div>
              <button
                type="button"
                onClick={() => setActiveJson(null)}
                className="btn-close-bottom"
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
