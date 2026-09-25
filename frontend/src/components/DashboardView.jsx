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
  formatHeapKb,
  getSavedOrInitialSlots,
  calculateSlotCounts,
  SLOTS_STORAGE_KEY
} from '../utils/dumpData'

export default function DashboardView({ onOpenModal }) {
  const [selectedZone, setSelectedZone] = useState('all')
  const [countdown, setCountdown] = useState(5)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [simulatedTime, setSimulatedTime] = useState(new Date())

  // Dynamic real slots for CAM-01 from shared storage
  const [cam1Slots, setCam1Slots] = useState(() => getSavedOrInitialSlots())

  // Real Dump Records State
  const [dumpRecords, setDumpRecords] = useState([])
  const [frameIndex, setFrameIndex] = useState(29) // Default to latest snapshot (index 29)

  // Listen for real-time slots updates from ParkingSetup ROI Editor
  useEffect(() => {
    const handleSlotsUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCam1Slots(e.detail)
      } else {
        setCam1Slots(getSavedOrInitialSlots())
      }
    }
    const handleStorage = (e) => {
      if (e.key === SLOTS_STORAGE_KEY || !e.key) {
        setCam1Slots(getSavedOrInitialSlots())
      }
    }
    window.addEventListener('cpe-slots-updated', handleSlotsUpdated)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('cpe-slots-updated', handleSlotsUpdated)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Calculate live slot metrics for CAM-01
  const cam1Counts = calculateSlotCounts(cam1Slots)

  // Load real dump metadata from /dump_data/metadata.json
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
    if (dumpRecords.length > 0) {
      setFrameIndex(dumpRecords.length - 1)
    }
    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }

  // Current real snapshot record from cam1
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

  // Camera Data incorporating real dump data for CAM-01
  const cameras = [
    {
      id: 1,
      slotCode: 'CAM-01',
      name: 'หน้าภาค (ลานหน้าภาควิชาคอมพิวเตอร์)',
      subtitle: 'Zone A - Main Front Gate',
      device: 'Edge Node (ESP32-CAM / Cam1)',
      zone: 'zone_a',
      ip: currentRecord.client_ip || '172.30.91.108',
      minioKey: `s3://raw-datasets/cam1/images/2026-09-22/18/${currentRecord.filename}`,
      fps: '0.2 fps (ทุก 5s)',
      status: 'online',
      latency: '34ms',
      isReal: true,
      imageUrl: currentRecord.image_url,
      snapshotTimestamp: currentRecord.local_time,
      realTelemetry: currentRecord,
      car: cam1Counts.car,
      bike: cam1Counts.bike,
      vacancyChance15m:
        cam1Counts.car.total + cam1Counts.bike.total > 0
          ? Math.min(
              95,
              Math.max(
                35,
                Math.round(
                  ((cam1Counts.car.free + cam1Counts.bike.free) /
                    (cam1Counts.car.total + cam1Counts.bike.total)) *
                    100
                )
              )
            )
          : 85,
      slots: cam1Slots
    },
    {
      id: 2,
      slotCode: 'CAM-02',
      name: 'ลานจอดรถในร่มข้างอาคาร',
      subtitle: 'Zone B - Covered Lot',
      device: 'Smartphone #2 (iPhone 13)',
      zone: 'zone_b',
      ip: '192.168.1.102',
      minioKey: 'parking-raw/cam2_latest.jpg',
      fps: '0.2 fps (ทุก 5s)',
      status: 'online',
      latency: '38ms',
      isReal: false,
      imageUrl: dumpRecords[8]?.image_url || '/dump_data/images/2026-09-22_18-00-42_303.jpg',
      snapshotTimestamp: '2026-09-22 18:00:42',
      realTelemetry: {
        chip_temp_c: 78.5,
        uptime_sec: 1850,
        free_heap: 160000,
        wifi_rssi_dbm: -75,
        status: 'ONLINE (HEALTHY)'
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
      name: 'ลานจอดด้านหลังภาควิชา',
      subtitle: 'Zone C - Rear Faculty Lot',
      device: 'Smartphone #3 (iPhone 13)',
      zone: 'zone_c',
      ip: '192.168.1.103',
      minioKey: 'parking-raw/cam3_latest.jpg',
      fps: '0.2 fps (ทุก 5s)',
      status: 'online',
      latency: '46ms',
      isReal: false,
      imageUrl: dumpRecords[18]?.image_url || '/dump_data/images/2026-09-22_18-01-33_173.jpg',
      snapshotTimestamp: '2026-09-22 18:01:33',
      realTelemetry: {
        chip_temp_c: 79.0,
        uptime_sec: 1920,
        free_heap: 158000,
        wifi_rssi_dbm: -79,
        status: 'ONLINE (HEALTHY)'
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

          {/* Ingestion Countdown & Refresh Button */}
          <div className="countdown-badge" title="เวลาถึงรอบจับภาพ Snapshot ถัดไป">
            <span className="text-[11px] text-slate-400">Snapshot ใน:</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
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

      {/* Camera Grid Section (Clean 3-Camera Uniform Layout) */}
      <div className="camera-grid-layout grid-cols-3">
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

              {/* Live ROI SVG Overlay for CAM-01 */}
              {cam.id === 1 && showRoiOverlay && (
                <svg
                  className="cam-tile-svg-overlay"
                  viewBox="0 0 1600 1200"
                >
                  {cam1Slots.map((s) => {
                    const isBike = s.type === 'motorcycle' || s.type === 'bike'
                    const isOccupied = !!s.occupied
                    const pts = s.points.map((p) => `${p.x},${p.y}`).join(' ')
                    const center = {
                      x: s.points.reduce((acc, p) => acc + p.x, 0) / s.points.length,
                      y: s.points.reduce((acc, p) => acc + p.y, 0) / s.points.length
                    }
                    return (
                      <g key={s.id}>
                        <polygon
                          points={pts}
                          className={`slot-polygon ${isBike ? 'bike-polygon' : 'car-polygon'} ${isOccupied ? 'occupied' : 'vacant'}`}
                        />
                        <rect
                          x={center.x - 32}
                          y={center.y - 12}
                          width={64}
                          height={24}
                          rx={5}
                          className={`slot-label-bg ${isBike ? 'bike-label' : 'car-label'} ${isOccupied ? 'occupied' : 'vacant'}`}
                        />
                        <text
                          x={center.x}
                          y={center.y + 5}
                          textAnchor="middle"
                          className="slot-label-text text-[11px]"
                        >
                          {isBike ? '🏍️ ' : '🚗 '}{s.id}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

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
                    {cam.isReal ? 'ONLINE • 5s' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Viewport Bottom Overlay */}
              <div className="viewport-overlay-bottom">
                <div className="cam-name-info">
                  <span className="cam-title-text">{cam.name}</span>
                  <span className="cam-sub-text">
                    {cam.subtitle} • {formatTimestampThai(cam.snapshotTimestamp)}
                  </span>
                </div>

                <div className="cam-actions-hover opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="action-btn-zoom"
                    title="ขยายดูภาพและผังช่องจอด ROI"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onOpenModal) onOpenModal(cam)
                    }}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Camera Metrics & Parking Counter Bar (Uniform on all cards) */}
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
                  🚗 {cam1Counts.car.free}/{cam1Counts.car.total} • 🏍️ {cam1Counts.bike.free}/{cam1Counts.bike.total} ว่าง (
                  {cam1Counts.car.total + cam1Counts.bike.total > 0
                    ? Math.round(
                        ((cam1Counts.car.occupied + cam1Counts.bike.occupied) /
                          (cam1Counts.car.total + cam1Counts.bike.total)) *
                          100
                      )
                    : 0}% จอดแล้ว)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-gradient-to-r from-emerald-500 to-blue-500"
                  style={{
                    width: `${
                      cam1Counts.car.total + cam1Counts.bike.total > 0
                        ? Math.round(
                            ((cam1Counts.car.occupied + cam1Counts.bike.occupied) /
                              (cam1Counts.car.total + cam1Counts.bike.total)) *
                              100
                          )
                        : 0
                    }%`
                  }}
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
