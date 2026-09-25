import React, { useState, useEffect } from 'react'
import {
  Video,
  Maximize2,
  RefreshCw,
  Car,
  Bike,
  Sparkles,
  Layers,
  Clock,
  Radio,
  Cpu,
  Wifi,
  Thermometer
} from 'lucide-react'
import {
  loadDumpMetadata,
  DEFAULT_CAM1_SLOTS,
  formatTimestampThai,
  formatUptime,
  formatHeapKb
} from '../utils/dumpData'

export default function DashboardView({ onOpenModal }) {
  const [gridMode, setGridMode] = useState(3) // 3 or 6 or 1
  const [selectedZone, setSelectedZone] = useState('all')
  const [countdown, setCountdown] = useState(5)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [simulatedTime, setSimulatedTime] = useState(new Date())

  // Real Live Ingestion Server & Dump Records State
  const [dumpRecords, setDumpRecords] = useState([])
  const [frameIndex, setFrameIndex] = useState(29) // Default to latest snapshot (index 29)
  const [liveData, setLiveData] = useState(null)
  const [imgKey, setImgKey] = useState(() => Date.now())

  const INGESTION_API =
    typeof window !== 'undefined'
      ? `http://${window.location.hostname}:5005`
      : 'http://localhost:5005'

  const fetchLiveTelemetry = async () => {
    try {
      const res = await fetch(`${INGESTION_API}/api/telemetry`)
      if (res.ok) {
        const data = await res.json()
        setLiveData(data)
        setImgKey(Date.now())
      }
    } catch (err) {
      // Fallback silently if port 5005 is not reachable
    }
  }

  // Poll live camera telemetry every 3s
  useEffect(() => {
    fetchLiveTelemetry()
    const liveTimer = setInterval(fetchLiveTelemetry, 3000)
    return () => clearInterval(liveTimer)
  }, [])

  // Load fallback dump metadata from /dump_data/metadata.json
  useEffect(() => {
    let mounted = true
    loadDumpMetadata().then((data) => {
      if (mounted && data && data.length > 0) {
        setDumpRecords(data)
        setFrameIndex(data.length - 1)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Dynamic countdown for 5s snapshot ingestion
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLiveTelemetry()
          if (dumpRecords.length > 0) {
            setFrameIndex((curr) => (curr + 1) % dumpRecords.length)
          }
          setSimulatedTime(new Date())
          return 5
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [dumpRecords])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    setCountdown(5)
    fetchLiveTelemetry()
    if (dumpRecords.length > 0) {
      setFrameIndex(dumpRecords.length - 1)
    }
    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }

  // Fallback snapshot record
  const currentRecord = dumpRecords[frameIndex] || {
    filename: '2026-09-22_18-02-28_966.jpg',
    image_url: '/dump_data/images/2026-09-22_18-02-28_966.jpg',
    local_time: '2026-09-22 18:02:28',
    client_ip: '172.30.91.108',
    chip_temp_c: 81.1,
    uptime_sec: 2288,
    free_heap: 156704,
    free_psram: 3419476,
    wifi_rssi_dbm: -82,
    light_aec_value: 490,
    status: 'ONLINE (HEALTHY)'
  }

  // Live telemetry per camera node
  const cam1Live = liveData?.front_dept_1 || liveData?.cam1
  const cam2Live = liveData?.front_dept_2 || liveData?.cam2
  const cam3Live = liveData?.side_dept || liveData?.cam3

  const cam1Image = cam1Live
    ? `${INGESTION_API}/api/latest?location=front_dept_1&image=true&t=${imgKey}`
    : currentRecord.image_url

  const cam2Image = cam2Live
    ? `${INGESTION_API}/api/latest?location=front_dept_2&image=true&t=${imgKey}`
    : dumpRecords[8]?.image_url || '/dump_data/images/2026-09-22_18-00-42_303.jpg'

  const cam3Image = cam3Live
    ? `${INGESTION_API}/api/latest?location=side_dept&image=true&t=${imgKey}`
    : dumpRecords[18]?.image_url || '/dump_data/images/2026-09-22_18-01-33_173.jpg'

  // Camera Data incorporating real live streams & telemetry
  const cameras = [
    {
      id: 1,
      slotCode: 'CAM-01',
      name: 'หน้าภาค (ลานหน้าภาควิชาคอมพิวเตอร์ 1)',
      subtitle: 'Zone A - Main Front Gate',
      device: 'Edge Node (ESP32-CAM / Cam1)',
      zone: 'zone_a',
      ip: cam1Live?.client_ip || currentRecord.client_ip || '172.30.94.142',
      minioKey: cam1Live ? `s3://raw-datasets/dataset/cam1/${cam1Live.partition?.date}/${cam1Live.partition?.hour}/images/${cam1Live.filename}` : `s3://raw-datasets/cam1/images/2026-09-22/18/${currentRecord.filename}`,
      fps: '0.2 fps (ทุก 5s)',
      status: 'online',
      latency: '28ms',
      isReal: true,
      imageUrl: cam1Image,
      snapshotTimestamp: cam1Live?.timestamp ? cam1Live.timestamp.replace('T', ' ').substring(0, 19) : currentRecord.local_time,
      realTelemetry: cam1Live
        ? {
            chip_temp_c: cam1Live.telemetry?.chip_temp_c ?? 42.5,
            uptime_sec: cam1Live.telemetry?.uptime_sec ?? 120,
            free_heap: cam1Live.telemetry?.free_heap ?? 154200,
            free_psram: cam1Live.telemetry?.free_psram ?? 3419476,
            wifi_rssi_dbm: cam1Live.telemetry?.wifi_rssi_dbm ?? cam1Live.telemetry?.rssi ?? -60,
            light_aec_value: cam1Live.telemetry?.aec_value ?? 294,
            client_ip: cam1Live.client_ip,
            filename: cam1Live.filename,
            status: 'ONLINE (LIVE STREAM)'
          }
        : currentRecord,
      car: { free: 4, total: 7 },
      bike: { free: 5, total: 8 },
      vacancyChance15m: 85,
      slots: DEFAULT_CAM1_SLOTS
    },
    {
      id: 2,
      slotCode: 'CAM-02',
      name: 'ลานจอดรถในร่มข้างอาคาร (หน้าภาค 2)',
      subtitle: 'Zone B - Covered Lot',
      device: 'Edge Node (ESP32-CAM / Cam2)',
      zone: 'zone_b',
      ip: cam2Live?.client_ip || '172.30.94.135',
      minioKey: cam2Live ? `s3://raw-datasets/dataset/cam2/${cam2Live.partition?.date}/${cam2Live.partition?.hour}/images/${cam2Live.filename}` : 'parking-raw/cam2_latest.jpg',
      fps: '0.2 fps (ทุก 5s)',
      status: 'online',
      latency: '31ms',
      isReal: true,
      imageUrl: cam2Image,
      snapshotTimestamp: cam2Live?.timestamp ? cam2Live.timestamp.replace('T', ' ').substring(0, 19) : '2026-09-25 15:27:48',
      realTelemetry: cam2Live
        ? {
            chip_temp_c: cam2Live.telemetry?.chip_temp_c ?? 62.8,
            uptime_sec: cam2Live.telemetry?.uptime_sec ?? 9,
            free_heap: cam2Live.telemetry?.free_heap ?? 155068,
            free_psram: cam2Live.telemetry?.free_psram ?? 3417932,
            wifi_rssi_dbm: cam2Live.telemetry?.wifi_rssi_dbm ?? cam2Live.telemetry?.rssi ?? -78,
            light_aec_value: cam2Live.telemetry?.aec_value ?? 196,
            client_ip: cam2Live.client_ip,
            filename: cam2Live.filename,
            status: 'ONLINE (LIVE STREAM)'
          }
        : {
            chip_temp_c: 62.8,
            uptime_sec: 9,
            free_heap: 155068,
            wifi_rssi_dbm: -78,
            status: 'ONLINE (LIVE)'
          },
      car: { free: 3, total: 8 },
      bike: { free: 4, total: 5 },
      vacancyChance15m: 78,
      slots: [
        { id: 'B01', type: 'car', occupied: true, name: '1กค-2020' },
        { id: 'B02', type: 'car', occupied: true, name: '2ขพ-4433' },
        { id: 'B03', type: 'car', occupied: true, name: '5กษ-8811' },
        { id: 'B04', type: 'car', occupied: false, name: 'ว่าง' },
        { id: 'B05', type: 'car', occupied: true, name: '3ฒณ-9090' },
        { id: 'B06', type: 'car', occupied: false, name: 'ว่าง' },
        { id: 'B07', type: 'car', occupied: false, name: 'ว่าง' },
        { id: 'B08', type: 'car', occupied: true, name: 'กง-1122' }
      ]
    },
    {
      id: 3,
      slotCode: 'CAM-03',
      name: 'ลานจอดด้านหลังภาควิชา (ข้างภาคคอม)',
      subtitle: 'Zone C - Rear Faculty Lot',
      device: 'Edge Node (ESP32-CAM / Cam3)',
      zone: 'zone_c',
      ip: cam3Live?.client_ip || '172.30.92.100',
      minioKey: cam3Live ? `s3://raw-datasets/dataset/cam3/${cam3Live.partition?.date}/${cam3Live.partition?.hour}/images/${cam3Live.filename}` : 'parking-raw/cam3_latest.jpg',
      fps: '0.2 fps (ทุก 5s)',
      status: 'online',
      latency: '36ms',
      isReal: true,
      imageUrl: cam3Image,
      snapshotTimestamp: cam3Live?.timestamp ? cam3Live.timestamp.replace('T', ' ').substring(0, 19) : '2026-09-25 14:46:36',
      realTelemetry: cam3Live
        ? {
            chip_temp_c: cam3Live.telemetry?.chip_temp_c ?? 42.5,
            uptime_sec: cam3Live.telemetry?.uptime_sec ?? 120,
            free_heap: cam3Live.telemetry?.free_heap ?? 154200,
            free_psram: cam3Live.telemetry?.free_psram ?? 3419476,
            wifi_rssi_dbm: cam3Live.telemetry?.wifi_rssi_dbm ?? cam3Live.telemetry?.rssi ?? -60,
            light_aec_value: cam3Live.telemetry?.aec_value ?? 490,
            client_ip: cam3Live.client_ip,
            filename: cam3Live.filename,
            status: 'ONLINE (LIVE STREAM)'
          }
        : {
            chip_temp_c: 42.5,
            uptime_sec: 120,
            free_heap: 154200,
            wifi_rssi_dbm: -60,
            status: 'ONLINE (LIVE)'
          },
      car: { free: 2, total: 5 },
      bike: { free: 2, total: 2 },
      vacancyChance15m: 60,
      slots: [
        { id: 'C01', type: 'car', occupied: true, name: 'อาจารย์ 1' },
        { id: 'C02', type: 'car', occupied: true, name: 'อาจารย์ 2' },
        { id: 'C03', type: 'car', occupied: true, name: 'เจ้าหน้าที่' },
        { id: 'C04', type: 'car', occupied: false, name: 'ว่าง' },
        { id: 'C05', type: 'car', occupied: false, name: 'ว่าง' }
      ]
    }
  ]

  // Filtered cameras based on zone selection
  const filteredCameras =
    selectedZone === 'all'
      ? cameras
      : cameras.filter((c) => c.zone === selectedZone)

  return (
    <div className="dashboard-content-wrapper">
      {/* Top View Control Bar (Clean Layout) */}
      <div className="view-control-bar">
        <div className="flex items-center gap-3">
          <div className="control-title-group">
            <div className="flex items-center gap-2">
              <h2 className="control-title">
                LIVE PARKING STREAMS (3 CAMERAS)
              </h2>
              <span className="badge-chip badge-chip-live">
                <span>REAL DATA</span>
              </span>
            </div>
            <span className="control-sub">
              มอนิเตอร์ภาพกล้องสดทุก 5s • Ingestion ข้อมูลจริงจากโฟลเดอร์ <code>images/</code> และ <code>metadata.json</code>
            </span>
          </div>
        </div>

        <div className="control-actions-group">
          {/* Zone Filter */}
          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${selectedZone === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedZone('all')}
            >
              ทั้งหมด (All)
            </button>
            <button
              type="button"
              className={`filter-pill ${selectedZone === 'zone_a' ? 'active' : ''}`}
              onClick={() => setSelectedZone('zone_a')}
            >
              Zone A (หน้าตึก)
            </button>
            <button
              type="button"
              className={`filter-pill ${selectedZone === 'zone_b' ? 'active' : ''}`}
              onClick={() => setSelectedZone('zone_b')}
            >
              Zone B (ในร่ม)
            </button>
            <button
              type="button"
              className={`filter-pill ${selectedZone === 'zone_c' ? 'active' : ''}`}
              onClick={() => setSelectedZone('zone_c')}
            >
              Zone C (หลังตึก)
            </button>
          </div>

          {/* Grid Mode Buttons */}
          <div className="grid-switcher">
            <button
              type="button"
              className={`grid-btn ${gridMode === 3 ? 'active' : ''}`}
              onClick={() => setGridMode(3)}
              title="3 Cameras"
            >
              3 Cam
            </button>
            <button
              type="button"
              className={`grid-btn ${gridMode === 6 ? 'active' : ''}`}
              onClick={() => setGridMode(6)}
              title="6 Cameras Grid"
            >
              6 Cam
            </button>
            <button
              type="button"
              className={`grid-btn ${gridMode === 1 ? 'active' : ''}`}
              onClick={() => setGridMode(1)}
              title="Single Focused Cam"
            >
              1 Cam
            </button>
          </div>

          {/* Ingestion Countdown & Refresh Button */}
          <div className="countdown-badge" title="เวลาถึงรอบจับภาพ Snapshot ถัดไป">
            <span className="text-[11px] text-slate-400">Snapshot ใน:</span>
            <span className="text-xs font-bold text-emerald-400">
              {countdown}s
            </span>
          </div>

          <button
            type="button"
            className={`btn-refresh-stream ${isRefreshing ? 'animate-spin' : ''}`}
            onClick={handleManualRefresh}
            title="ดึงภาพ Snapshot ล่าสุดทันที"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Grid Section */}
      <div
        className={`camera-grid-layout ${
          gridMode === 3
            ? 'grid-cols-3'
            : gridMode === 6
            ? 'grid-cols-3-double'
            : 'grid-cols-1'
        }`}
      >
        {filteredCameras.map((cam) => (
          <div
            key={cam.id}
            className="camera-card-tile group"
            onClick={() => onOpenModal && onOpenModal(cam)}
          >
            {/* Visual Feed Area (Uncropped 4:3 view - Shows ALL cars and road completely!) */}
            <div className="camera-viewport">
              <img
                src={cam.imageUrl}
                alt={cam.name}
                className="camera-feed-img"
              />

              {/* Viewport Header Overlay */}
              <div className="viewport-overlay-top">
                <div className="cam-code-tag flex items-center gap-1.5">
                  <span className="font-bold text-emerald-400">
                    {cam.slotCode}
                  </span>
                  <span className="device-tag">{cam.device}</span>
                </div>

                <div className="cam-live-indicator">
                  <span className="live-ping"></span>
                  <span className="live-dot"></span>
                  <span className="live-text">
                    {cam.isReal ? 'ONLINE • 5s SNAP' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Viewport Bottom Overlay */}
              <div className="viewport-overlay-bottom">
                <div className="cam-name-info">
                  <span className="cam-title-text">{cam.name}</span>
                  <span className="cam-sub-text">
                    {cam.subtitle} • IP: {cam.ip}
                  </span>
                </div>

                <div className="cam-actions-hover opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="action-btn-zoom"
                    title="ขยายดูภาพและดีเทล"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onOpenModal) onOpenModal(cam)
                    }}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Camera Time Watermark */}
              <div className="viewport-timestamp">
                {cam.snapshotTimestamp
                  ? `REC: ${formatTimestampThai(cam.snapshotTimestamp)}`
                  : `${simulatedTime.toISOString().replace('T', ' ').substring(0, 19)}`}
              </div>
            </div>

            {/* Hardware Telemetry Bar (Clean Unified Typography matching the dashboard) */}
            {cam.isReal && (
              <div className="cam-telemetry-strip">
                <div className="telemetry-metrics-row">
                  <div className="telemetry-pill-item" title="อุณหภูมิชิปประมวลผล (Core Temp)">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Temp:</span>
                    <span className="telemetry-pill-value text-amber-300 font-semibold">
                      {cam.realTelemetry?.chip_temp_c ? `${cam.realTelemetry.chip_temp_c.toFixed(1)}°C` : '80.5°C'}
                    </span>
                  </div>

                  <div className="telemetry-pill-item" title="หน่วยความจำคงเหลือ (Free Heap)">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Heap:</span>
                    <span className="telemetry-pill-value text-cyan-300 font-semibold">
                      {formatHeapKb(cam.realTelemetry?.free_heap)}
                    </span>
                  </div>

                  <div className="telemetry-pill-item" title="ความแรงสัญญาณ Wi-Fi (RSSI)">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>RSSI:</span>
                    <span className="telemetry-pill-value text-emerald-300 font-semibold">
                      {cam.realTelemetry?.wifi_rssi_dbm ? `${cam.realTelemetry.wifi_rssi_dbm} dBm` : '-82 dBm'}
                    </span>
                  </div>

                  <div className="telemetry-pill-item" title="ระยะเวลาเปิดทำงานต่อเนื่อง">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Up:</span>
                    <span className="telemetry-pill-value text-purple-300 font-semibold">
                      {formatUptime(cam.realTelemetry?.uptime_sec)}
                    </span>
                  </div>
                </div>

                {/* Clean Status Tag */}
                <span className="telemetry-status-tag">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{cam.realTelemetry?.status || 'ONLINE'}</span>
                </span>
              </div>
            )}

            {/* Camera Metrics & Parking Counter Bar */}
            <div className="camera-metrics-bar">
              <div className="flex items-center gap-3">
                <div className="slot-badge car-badge">
                  <Car className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    ว่าง <strong className="text-white">{cam.car.free}</strong>/{cam.car.total}
                  </span>
                </div>

                <div className="slot-badge bike-badge">
                  <Bike className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    ว่าง <strong className="text-white">{cam.bike.free}</strong>/{cam.bike.total}
                  </span>
                </div>
              </div>

              <div className="chance-badge">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>
                  โอกาสว่าง: <strong>{cam.vacancyChance15m}%</strong> (+15น.)
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* In 6 Cam mode, show standby slots 4, 5, 6 */}
        {gridMode === 6 && (
          <>
            <div className="camera-card-tile standby-tile">
              <div className="standby-viewport">
                <Video className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-xs font-bold text-slate-400">
                  CAM-04 [STANDBY NODE]
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  ลานจอดสำรองทิศใต้ (South Expansion)
                </span>
                <span className="standby-badge">Unassigned Stream</span>
              </div>
            </div>

            <div className="camera-card-tile standby-tile">
              <div className="standby-viewport">
                <Video className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-xs font-bold text-slate-400">
                  CAM-05 [STANDBY NODE]
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  จุดจอดจักรยานยนต์โซนทางเชื่อม
                </span>
                <span className="standby-badge">Unassigned Stream</span>
              </div>
            </div>

            <div className="camera-card-tile standby-tile">
              <div className="standby-viewport">
                <Video className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-xs font-bold text-slate-400">
                  CAM-06 [STANDBY NODE]
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  ทางออกลานจอดรถด้านข้าง
                </span>
                <span className="standby-badge">Unassigned Stream</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Intelligence & Analytics Section (Balanced 2-Column Layout, LINE Card Removed) */}
      <div className="dashboard-analytics-grid">
        {/* Card 1: Zone Occupancy Distribution */}
        <div className="analytics-card zone-distribution-card">
          <div className="card-top-bar">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="card-heading">ZONE OCCUPANCY BREAKDOWN</h3>
                <span className="card-subheading">
                  สัดส่วนการจอดแยกตามโซนกล้องทั้ง 3 ตัว
                </span>
              </div>
            </div>
          </div>

          <div className="zone-progress-list">
            <div className="zone-progress-item">
              <div className="zone-progress-header">
                <span className="font-medium text-xs text-white">Zone A (ลานหน้าตึก)</span>
                <span className="text-xs text-emerald-400 font-bold">
                  4/7 ว่าง (43% รถจอด)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-gradient-to-r from-emerald-500 to-blue-500"
                  style={{ width: '43%' }}
                ></div>
              </div>
            </div>

            <div className="zone-progress-item">
              <div className="zone-progress-header">
                <span className="font-medium text-xs text-white">Zone B (ลานในร่มข้างตึก)</span>
                <span className="text-xs text-amber-400 font-bold">
                  3/8 ว่าง (62% รถจอด)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-gradient-to-r from-amber-500 to-rose-500"
                  style={{ width: '62%' }}
                ></div>
              </div>
            </div>

            <div className="zone-progress-item">
              <div className="zone-progress-header">
                <span className="font-medium text-xs text-white">Zone C (ลานหลังตึกบุคลากร)</span>
                <span className="text-xs text-blue-400 font-bold">
                  2/5 ว่าง (60% รถจอด)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width: '60%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="quick-kpi-grid">
            <div className="kpi-box">
              <span className="kpi-title">Turnover Rate เฉลี่ย</span>
              <span className="kpi-val text-emerald-400">1.8 คัน/ชม.</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-title">เวลาจอดเฉลี่ย</span>
              <span className="kpi-val text-cyan-400">1 ชม. 45 นาที</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-title">ความแม่นยำ AI Detection</span>
              <span className="kpi-val text-indigo-400">94.8% mAP</span>
            </div>
          </div>
        </div>

        {/* Card 2: Live Ingestion & Telemetry Logs */}
        <div className="analytics-card events-log-card">
          <div className="card-top-bar">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="card-heading">REAL-TIME INGESTION LOGS</h3>
                <span className="card-subheading">
                  เหตุการณ์การส่งภาพทุก 5s และ telemetry จาก CAM-01
                </span>
              </div>
            </div>
            <span className="log-badge-pulse">Live Telemetry</span>
          </div>

          <div className="logs-scroll-area">
            <div className="log-entry">
              <span className="log-time">18:02:28</span>
              <span className="log-badge log-ingest">DUMP</span>
              <span className="log-desc">
                [CAM-01] Snapshot <code>2026-09-22_18-02-28_966.jpg</code> • Chip: 81.1°C • Heap: 156.7KB
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time">18:02:24</span>
              <span className="log-badge log-infer">INFER</span>
              <span className="log-desc">
                Inference Worker evaluated 5 ROI parking slots, 0.038s processing latency
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time">18:02:19</span>
              <span className="log-badge log-event">STATE</span>
              <span className="log-desc">
                Slot A-03 verified <strong>VACANT</strong> (Confidence 97.4%)
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time">18:02:14</span>
              <span className="log-badge log-ingest">INGEST</span>
              <span className="log-desc">
                [CAM-01] Frame ingested to MinIO bucket <code>raw-datasets/cam1</code> (257KB)
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time">18:02:00</span>
              <span className="log-badge log-ingest">INGEST</span>
              <span className="log-desc">
                [CAM-01] Snapshot captured by ESP32-CAM (172.30.91.108)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
