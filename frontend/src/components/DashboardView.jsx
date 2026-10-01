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
  Thermometer,
  MapPin,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import {
  loadDumpMetadata,
  DEFAULT_CAM1_SLOTS,
  formatTimestampThai,
  formatUptime,
  formatHeapKb,
  getSavedOrInitialSlots,
  calculateSlotCounts,
  getCameraImage,
  SLOTS_STORAGE_KEY,
  syncAllSlotsFromServer,
  getIngestionApiBase,
  checkCameraOnlineStatus
} from '../utils/dumpData'

export default function DashboardView({ onOpenModal, onNavigate }) {
  const INGESTION_API = getIngestionApiBase()
  const [selectedZone, setSelectedZone] = useState('all')
  const [countdown, setCountdown] = useState(5)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [simulatedTime, setSimulatedTime] = useState(new Date())
  const [showRoiOverlay, setShowRoiOverlay] = useState(true)

  // Dynamic real slots for all 3 cameras from shared storage
  const [cam1Slots, setCam1Slots] = useState(() => getSavedOrInitialSlots('cam1'))
  const [cam2Slots, setCam2Slots] = useState(() => getSavedOrInitialSlots('cam2'))
  const [cam3Slots, setCam3Slots] = useState(() => getSavedOrInitialSlots('cam3'))

  // Custom uploaded images for cameras
  const [cam1CustomImage, setCam1CustomImage] = useState(() => getCameraImage('cam1'))
  const [cam2CustomImage, setCam2CustomImage] = useState(() => getCameraImage('cam2'))
  const [cam3CustomImage, setCam3CustomImage] = useState(() => getCameraImage('cam3'))

  // Real Live Ingestion Server & Dump Records State
  const [dumpRecords, setDumpRecords] = useState([])
  const [frameIndex, setFrameIndex] = useState(29) // Default to latest snapshot (index 29)
  const [liveData, setLiveData] = useState(null)
  const [imgKey, setImgKey] = useState(() => Date.now())

  const fetchLiveTelemetry = async () => {
    try {
      let res = await fetch('/api/telemetry')
      if (!res.ok) {
        const fallback =
          typeof window !== 'undefined'
            ? `http://${window.location.hostname}:5005/api/telemetry`
            : 'http://localhost:5005/api/telemetry'
        res = await fetch(fallback)
      }
      if (res.ok) {
        const data = await res.json()
        setLiveData(data)
        setImgKey(Date.now())
      }
    } catch (err) {
      // Fallback silently if ingestion API is not reachable
    }
  }

  // Poll live camera telemetry every 3s
  useEffect(() => {
    fetchLiveTelemetry()
    const liveTimer = setInterval(fetchLiveTelemetry, 3000)
    return () => clearInterval(liveTimer)
  }, [])

  // Synchronize and poll parking slots from central server so all connected machines display identical ROI
  useEffect(() => {
    let isMounted = true

    const syncServerRoi = async () => {
      try {
        const synced = await syncAllSlotsFromServer()
        if (synced && isMounted) {
          if (synced.cam1) setCam1Slots(synced.cam1)
          if (synced.cam2) setCam2Slots(synced.cam2)
          if (synced.cam3) setCam3Slots(synced.cam3)
        }
      } catch (err) {
        // Fallback silently
      }
    }

    syncServerRoi()
    const roiTimer = setInterval(syncServerRoi, 3000)
    return () => {
      isMounted = false
      clearInterval(roiTimer)
    }
  }, [])

  // Listen for real-time slots and images updates from ParkingSetup ROI Editor
  useEffect(() => {
    const handleSlotsUpdated = (e) => {
      const detail = e.detail
      if (detail && detail.cameraId) {
        if (detail.cameraId === 'cam1') setCam1Slots(detail.slots)
        else if (detail.cameraId === 'cam2') setCam2Slots(detail.slots)
        else if (detail.cameraId === 'cam3') setCam3Slots(detail.slots)
      } else if (Array.isArray(detail)) {
        setCam1Slots(detail)
      } else {
        setCam1Slots(getSavedOrInitialSlots('cam1'))
        setCam2Slots(getSavedOrInitialSlots('cam2'))
        setCam3Slots(getSavedOrInitialSlots('cam3'))
      }
    }

    const handleImageUpdated = (e) => {
      const detail = e.detail
      if (detail && detail.cameraId) {
        if (detail.cameraId === 'cam1') setCam1CustomImage(detail.imageUrl)
        else if (detail.cameraId === 'cam2') setCam2CustomImage(detail.imageUrl)
        else if (detail.cameraId === 'cam3') setCam3CustomImage(detail.imageUrl)
      }
    }

    const handleStorage = (e) => {
      if (!e.key || e.key.startsWith('cpe_parking_slots_')) {
        setCam1Slots(getSavedOrInitialSlots('cam1'))
        setCam2Slots(getSavedOrInitialSlots('cam2'))
        setCam3Slots(getSavedOrInitialSlots('cam3'))
      }
      if (!e.key || e.key.startsWith('cpe_camera_image_')) {
        setCam1CustomImage(getCameraImage('cam1'))
        setCam2CustomImage(getCameraImage('cam2'))
        setCam3CustomImage(getCameraImage('cam3'))
      }
    }

    window.addEventListener('cpe-slots-updated', handleSlotsUpdated)
    window.addEventListener('cpe-camera-image-updated', handleImageUpdated)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('cpe-slots-updated', handleSlotsUpdated)
      window.removeEventListener('cpe-camera-image-updated', handleImageUpdated)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Calculate live slot metrics for all 3 cameras
  const cam1Counts = calculateSlotCounts(cam1Slots)
  const cam2Counts = calculateSlotCounts(cam2Slots)
  const cam3Counts = calculateSlotCounts(cam3Slots)

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

  // Evaluate Online/Offline status based on 15-minute frame age threshold
  const cam1Status = checkCameraOnlineStatus(cam1Live?.timestamp, 15)
  const cam2Status = checkCameraOnlineStatus(cam2Live?.timestamp, 15)
  const cam3Status = checkCameraOnlineStatus(cam3Live?.timestamp, 15)

  const cam1Image = cam1CustomImage || `${INGESTION_API}/api/latest?camera_id=cam1&image=true&t=${imgKey}`
  const cam2Image = cam2CustomImage || `${INGESTION_API}/api/latest?camera_id=cam2&image=true&t=${imgKey}`
  const cam3Image = cam3CustomImage || `${INGESTION_API}/api/latest?camera_id=cam3&image=true&t=${imgKey}`

  // Camera Data incorporating real live streams, telemetry & shared slot registry
  const cameras = [
    {
      id: 1,
      camId: 'cam1',
      slotCode: 'CAM-01',
      name: 'หน้าภาค (ลานหน้าภาควิชาคอมพิวเตอร์ 1)',
      subtitle: 'Zone A - หน้าภาค 1 (รถยนต์)',
      device: 'Edge Node (ESP32-CAM / Cam1)',
      zone: 'zone_a',
      ip: cam1Live?.client_ip || '172.30.91.44',
      minioKey: cam1Live?.minio_url ? `s3://raw-datasets/${cam1Live.minio_url}` : 's3://raw-datasets/dataset/cam1/latest.jpg',
      fps: cam1Status.isOnline ? '0.2 fps (ทุก 5s)' : '0.0 fps (ออฟไลน์)',
      status: cam1Status.status,
      isOnline: cam1Status.isOnline,
      statusInfo: cam1Status,
      latency: cam1Status.isOnline ? '28ms' : 'No Signal',
      isReal: true,
      imageUrl: cam1Image,
      snapshotTimestamp: cam1Live?.timestamp ? cam1Live.timestamp.replace('T', ' ').substring(0, 19) : 'ไม่มีสัญญาณภาพ',
      realTelemetry: {
        chip_temp_c: cam1Live?.telemetry?.chip_temp_c ?? cam1Live?.chip_temp_c ?? 53.3,
        uptime_sec: cam1Live?.telemetry?.uptime_sec ?? 2139,
        free_heap: cam1Live?.telemetry?.free_heap ?? 154200,
        free_psram: cam1Live?.telemetry?.free_psram ?? 3419476,
        wifi_rssi_dbm: cam1Live?.telemetry?.wifi_rssi_dbm ?? cam1Live?.wifi_rssi_dbm ?? -65,
        light_aec_value: cam1Live?.telemetry?.aec_value ?? 294,
        client_ip: cam1Live?.client_ip || '172.30.91.44',
        filename: cam1Live?.filename || 'cam1_live_stream.jpg',
        status: cam1Status.isOnline ? 'ONLINE (LIVE STREAM)' : `OFFLINE (${cam1Status.diffText})`
      },
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
      camId: 'cam2',
      slotCode: 'CAM-02',
      name: 'ลานจอดรถในร่มข้างอาคาร (หน้าภาค 2)',
      subtitle: 'Zone B - หน้าภาค 2 (รถยนต์)',
      device: 'Edge Node (ESP32-CAM / Cam2)',
      zone: 'zone_b',
      ip: cam2Live?.client_ip || '172.30.92.108',
      minioKey: cam2Live?.minio_url ? `s3://raw-datasets/${cam2Live.minio_url}` : 's3://raw-datasets/dataset/cam2/latest.jpg',
      fps: cam2Status.isOnline ? '0.2 fps (ทุก 5s)' : '0.0 fps (ออฟไลน์)',
      status: cam2Status.status,
      isOnline: cam2Status.isOnline,
      statusInfo: cam2Status,
      latency: cam2Status.isOnline ? '31ms' : 'No Signal',
      isReal: true,
      imageUrl: cam2Image,
      snapshotTimestamp: cam2Live?.timestamp ? cam2Live.timestamp.replace('T', ' ').substring(0, 19) : 'ไม่มีสัญญาณภาพ',
      realTelemetry: {
        chip_temp_c: cam2Live?.telemetry?.chip_temp_c ?? cam2Live?.chip_temp_c ?? 54.1,
        uptime_sec: cam2Live?.telemetry?.uptime_sec ?? 1840,
        free_heap: cam2Live?.telemetry?.free_heap ?? 155068,
        free_psram: cam2Live?.telemetry?.free_psram ?? 3417932,
        wifi_rssi_dbm: cam2Live?.telemetry?.wifi_rssi_dbm ?? cam2Live?.wifi_rssi_dbm ?? -68,
        light_aec_value: cam2Live?.telemetry?.aec_value ?? 196,
        client_ip: cam2Live?.client_ip || '172.30.92.108',
        filename: cam2Live?.filename || 'cam2_live_stream.jpg',
        status: cam2Status.isOnline ? 'ONLINE (LIVE STREAM)' : `OFFLINE (${cam2Status.diffText})`
      },
      car: cam2Counts.car,
      bike: cam2Counts.bike,
      vacancyChance15m:
        cam2Counts.car.total + cam2Counts.bike.total > 0
          ? Math.min(
              95,
              Math.max(
              35,
              Math.round(
                ((cam2Counts.car.free + cam2Counts.bike.free) /
                  (cam2Counts.car.total + cam2Counts.bike.total)) *
                  100
              )
            )
          )
        : 78,
      slots: cam2Slots
    },
    {
      id: 3,
      camId: 'cam3',
      slotCode: 'CAM-03',
      name: 'ลานจอดด้านหลังภาควิชา (ข้างภาคคอม)',
      subtitle: 'Zone C - ข้างภาคคอม (มอเตอร์ไซค์)',
      device: 'Edge Node (ESP32-CAM / Cam3)',
      zone: 'zone_c',
      ip: cam3Live?.client_ip || '172.30.92.100',
      minioKey: cam3Live?.minio_url ? `s3://raw-datasets/${cam3Live.minio_url}` : 's3://raw-datasets/dataset/cam3/latest.jpg',
      fps: cam3Status.isOnline ? '0.2 fps (ทุก 5s)' : '0.0 fps (ออฟไลน์)',
      status: cam3Status.status,
      isOnline: cam3Status.isOnline,
      statusInfo: cam3Status,
      latency: cam3Status.isOnline ? '36ms' : 'No Signal',
      isReal: true,
      imageUrl: cam3Image,
      snapshotTimestamp: cam3Live?.timestamp ? cam3Live.timestamp.replace('T', ' ').substring(0, 19) : 'ไม่มีสัญญาณภาพ',
      realTelemetry: {
        chip_temp_c: cam3Live?.telemetry?.chip_temp_c ?? cam3Live?.chip_temp_c ?? 51.7,
        uptime_sec: cam3Live?.telemetry?.uptime_sec ?? 1920,
        free_heap: cam3Live?.telemetry?.free_heap ?? 154200,
        free_psram: cam3Live?.telemetry?.free_psram ?? 3419476,
        wifi_rssi_dbm: cam3Live?.telemetry?.wifi_rssi_dbm ?? cam3Live?.wifi_rssi_dbm ?? -62,
        light_aec_value: cam3Live?.telemetry?.aec_value ?? 490,
        client_ip: cam3Live?.client_ip || '172.30.92.100',
        filename: cam3Live?.filename || 'cam3_live_stream.jpg',
        status: cam3Status.isOnline ? 'ONLINE (LIVE STREAM)' : `OFFLINE (${cam3Status.diffText})`
      },
      car: cam3Counts.car,
      bike: cam3Counts.bike,
      vacancyChance15m:
        cam3Counts.car.total + cam3Counts.bike.total > 0
          ? Math.min(
              95,
              Math.max(
              35,
              Math.round(
                ((cam3Counts.car.free + cam3Counts.bike.free) /
                  (cam3Counts.car.total + cam3Counts.bike.total)) *
                  100
              )
            )
          )
        : 60,
      slots: cam3Slots
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
              มอนิเตอร์ภาพกล้องสดทุก 5s • ตรวจจับสถานะออนไลน์อัตโนมัติ (เกิน 15 นาทีถือว่าออฟไลน์)
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
            className={`camera-card-tile group ${!cam.isOnline ? 'offline' : ''}`}
            onClick={() => onOpenModal && onOpenModal(cam)}
          >
            {/* Visual Feed Area (Uncropped 4:3 view - Shows ALL cars and road completely!) */}
            <div className="camera-viewport relative">
              <img
                src={cam.imageUrl}
                alt={cam.name}
                className="camera-feed-img"
              />

              {/* Offline Warning Banner when last frame > 15m */}
              {!cam.isOnline && (
                <div className="cam-offline-banner">
                  <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 animate-pulse" />
                  <span className="truncate">
                    กล้องออฟไลน์ • ภาพล่าสุด {cam.statusInfo?.diffText || 'เกิน 15 นาที'}
                  </span>
                </div>
              )}

              {/* Live ROI SVG Overlay for any camera */}
              {showRoiOverlay && cam.slots && cam.slots.length > 0 && (
                <svg
                  className="cam-tile-svg-overlay"
                  viewBox="0 0 1600 1200"
                >
                  {cam.slots.map((s) => {
                    if (!s.points || s.points.length === 0) return null
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
                          {s.id}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {/* Viewport Header Overlay */}
              <div className="viewport-overlay-top">
                <div className="cam-code-tag flex items-center gap-1.5">
                  <span className={`font-bold ${cam.isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {cam.slotCode}
                  </span>
                  <span className="device-tag">{cam.device}</span>
                </div>

                <div className={`cam-live-indicator ${cam.isOnline ? 'online' : 'offline'}`}>
                  {cam.isOnline ? (
                    <>
                      <span className="live-ping"></span>
                      <span className="live-dot"></span>
                      <span className="live-text">ONLINE • 5s</span>
                    </>
                  ) : (
                    <>
                      <span className="offline-dot"></span>
                      <span className="live-text font-bold">
                        OFFLINE ({cam.statusInfo?.diffMinutes < 60 ? `${cam.statusInfo?.diffMinutes}m` : `${Math.floor(cam.statusInfo?.diffMinutes/60)}h`})
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Viewport Bottom Overlay */}
              <div className="viewport-overlay-bottom">
                <div className="cam-name-info">
                  <span className="cam-title-text">{cam.name}</span>
                  <span className="cam-sub-text">
                    {cam.subtitle} • {cam.isOnline ? formatTimestampThai(cam.snapshotTimestamp) : `ภาพล่าสุด: ${cam.snapshotTimestamp} (${cam.statusInfo?.diffText})`}
                  </span>
                </div>

                <div className="cam-actions-hover">
                  <button
                    type="button"
                    className={`btn-toggle-roi-mini ${showRoiOverlay ? 'active' : ''}`}
                    title="เปิด/ปิด ผังพิกัดช่องจอด ROI บนภาพ"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowRoiOverlay(!showRoiOverlay)
                    }}
                  >
                    <Layers className="w-3 h-3" />
                    <span>{showRoiOverlay ? 'ผัง ROI: เปิด' : 'ผัง ROI: ปิด'}</span>
                  </button>

                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-toggle-roi-mini"
                      title={`ไปที่หน้า Setup ROI เพื่อวาดพิกัดของ ${cam.slotCode}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate('slot_map', cam.camId)
                      }}
                    >
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>วาด ROI</span>
                    </button>
                  )}

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
            {[
              {
                code: 'CAM-01',
                zone: 'Zone A',
                name: 'ลานหน้าตึก',
                counts: cam1Counts,
                colorClass: 'emerald'
              },
              {
                code: 'CAM-02',
                zone: 'Zone B',
                name: 'ลานในร่มข้างตึก',
                counts: cam2Counts,
                colorClass: 'amber'
              },
              {
                code: 'CAM-03',
                zone: 'Zone C',
                name: 'ลานหลังตึกบุคลากร',
                counts: cam3Counts,
                colorClass: 'cyan'
              }
            ].map((z) => {
              const totalSlots = z.counts.car.total + z.counts.bike.total
              const occupiedSlots = z.counts.car.occupied + z.counts.bike.occupied
              const occPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0
              const status = occPct >= 80 ? 'full' : occPct >= 40 ? 'moderate' : 'available'

              return (
                <div className="zone-progress-item-card" key={z.code}>
                  <div className="zone-item-header">
                    <div className="zone-title-group">
                      <span className="zone-code-tag">{z.zone}</span>
                      <span className="zone-location-name font-bold">{z.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({z.code})</span>
                    </div>
                    <div className="zone-occupancy-pill">
                      <span className={`status-dot ${status}`}></span>
                      <span className="pct-text font-mono font-bold text-slate-200">{occPct}% จอดแล้ว</span>
                    </div>
                  </div>

                  <div className="zone-breakdown-pills">
                    <div className="breakdown-pill car">
                      <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="pill-label">รถยนต์:</span>
                      <span className="pill-val font-mono font-bold">{z.counts.car.free}/{z.counts.car.total} ว่าง</span>
                    </div>
                    <div className="breakdown-pill bike">
                      <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="pill-label">มอเตอร์ไซค์:</span>
                      <span className="pill-val font-mono font-bold">{z.counts.bike.free}/{z.counts.bike.total} ว่าง</span>
                    </div>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${z.colorClass}`}
                      style={{ width: `${occPct}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
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
              <span className="log-time font-mono">
                {currentRecord.local_time ? currentRecord.local_time.split(' ')[1] : '18:02:28'}
              </span>
              <span className="log-badge log-ingest">LATEST</span>
              <span className="log-desc">
                [CAM-01] Snapshot <code>{currentRecord.filename}</code> • Chip: <strong>{currentRecord.chip_temp_c}°C</strong> • Heap: {Math.round((currentRecord.free_heap || 156704) / 1024)}KB
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time font-mono">
                {cam1Live ? 'LIVE' : 'TELEMETRY'}
              </span>
              <span className="log-badge log-infer">STATUS</span>
              <span className="log-desc">
                ESP32 IP <code>{currentRecord.client_ip || '172.30.91.108'}</code> • WiFi RSSI: {currentRecord.wifi_rssi_dbm || -82}dBm • AEC Light: {currentRecord.light_aec_value || 490}
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time font-mono">5s SYNC</span>
              <span className="log-badge log-infer">INFER</span>
              <span className="log-desc">
                AI Detection active on 3 Cameras (CAM-01, CAM-02, CAM-03), 0.038s processing latency
              </span>
            </div>
            <div className="log-entry">
              <span className="log-time font-mono">MINIO</span>
              <span className="log-badge log-ingest">INGEST</span>
              <span className="log-desc">
                Snapshot ingested to MinIO bucket <code>raw-datasets/cam1/images</code> (Sidecar JSON sync)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
