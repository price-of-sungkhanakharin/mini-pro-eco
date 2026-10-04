import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  Pentagon,
  MousePointer,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  Car,
  Bike,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Save,
  Plus,
  ArrowRight
} from 'lucide-react'
import {
  SYSTEM_CAMERAS,
  getCameraConfig,
  getCameraImage,
  saveCameraImage,
  getIngestionApiBase,
  saveRoiToServer,
  fetchRoiFromServer,
  getSavedOrInitialZones,
  saveZonesToStorage,
  normalizeZones,
  formatPolygonForServer
} from '../../../utils/dumpData'

// Native image resolution of the camera snapshot (1600x1200)
const NATIVE_WIDTH = 1600
const NATIVE_HEIGHT = 1200

// Calculate polygon pixel area using Shoelace formula
function calculatePolygonArea(points) {
  if (!points || !Array.isArray(points) || points.length < 3) return 0
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.round(Math.abs(area) / 2)
}

export default function ParkingSetup({ onNavigate, embedded = false, initialCameraId = 'cam1' }) {
  // Active Camera Selection State (cam1, cam2, cam3)
  const [selectedCamId, setSelectedCamId] = useState(() => initialCameraId || 'cam1')
  const activeCam = getCameraConfig(selectedCamId)

  // Real live camera snapshots and metadata from Ingestion Server
  const [liveSnapshotKey, setLiveSnapshotKey] = useState(() => Date.now())
  const [liveCameraMeta, setLiveCameraMeta] = useState(null)
  const [autoLivePolling, setAutoLivePolling] = useState(false)
  const [isSyncingServer, setIsSyncingServer] = useState(false)

  // Custom uploaded/configured snapshot image for current camera
  const [customCamImage, setCustomCamImage] = useState(() => getCameraImage(selectedCamId))

  // Multi-Zone Area Polygons state (AI pixel masks / parking lot boundaries per camera)
  const [zones, setZones] = useState(() => getSavedOrInitialZones(selectedCamId))
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [zoneDrawType, setZoneDrawType] = useState('car') // 'car' or 'motorcycle'
  const [isDrawingZone, setIsDrawingZone] = useState(false)
  const [zoneDraft, setZoneDraft] = useState([])
  const [showZoneOverlay, setShowZoneOverlay] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  // Vertex dragging state
  const [dragging, setDragging] = useState(null)

  // Modals & Notifications
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [notification, setNotification] = useState(null)

  const fileInputRef = useRef(null)
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const prevCamIdRef = useRef(selectedCamId)

  // Fetch real-time live camera information
  const fetchCameraLive = async (camId) => {
    const apiBase = getIngestionApiBase()
    const targetCam = camId || selectedCamId
    try {
      const latestRes = await fetch(`${apiBase}/api/latest?camera_id=${targetCam}`)
      if (latestRes.ok) {
        const latestData = await latestRes.json()
        setLiveCameraMeta(latestData)
      }
    } catch (err) {
      console.warn('Could not fetch live camera info:', err)
    }
  }

  // Load live camera feed on mount and when switching cameras
  useEffect(() => {
    fetchCameraLive(selectedCamId)
    setLiveSnapshotKey(Date.now())
    setCustomCamImage(getCameraImage(selectedCamId))
    setZoneDraft([])
    setIsDrawingZone(false)
    setSelectedZoneId(null)
  }, [selectedCamId])

  // Real-time Auto-Polling (every 4 seconds for live snapshot updates)
  useEffect(() => {
    if (!autoLivePolling) return
    const timer = setInterval(() => {
      setLiveSnapshotKey(Date.now())
      fetchCameraLive(selectedCamId)
    }, 4000)
    return () => clearInterval(timer)
  }, [autoLivePolling, selectedCamId])

  // When initialCameraId prop changes externally
  useEffect(() => {
    if (initialCameraId && initialCameraId !== selectedCamId) {
      setSelectedCamId(initialCameraId)
    }
  }, [initialCameraId])

  // Fetch real ROI zones from server when camera changes or on mount
  useEffect(() => {
    let isMounted = true
    const loadServerRoi = async () => {
      try {
        const roiData = await fetchRoiFromServer(selectedCamId)
        if (!isMounted) return
        const serverCam = roiData ? (roiData[selectedCamId] || roiData[activeCam.location]) : null
        if (serverCam && (serverCam.zones || serverCam.polygon)) {
          const rawZones = serverCam.zones || serverCam.polygon
          const normalized = normalizeZones(rawZones)
          if (normalized.length > 0) {
            setZones(normalized)
            saveZonesToStorage(normalized, selectedCamId, false)
          }
        }
      } catch (e) {
        console.warn('Could not load server ROI for', selectedCamId, e)
      }
    }
    loadServerRoi()
    return () => {
      isMounted = false
    }
  }, [selectedCamId])

  // Auto-save zones to localStorage & debounced sync to server whenever zones change
  useEffect(() => {
    if (prevCamIdRef.current === selectedCamId) {
      saveZonesToStorage(zones, selectedCamId)

      // Debounced auto-sync to central server (1.5s after editing)
      if (zones.length > 0) {
        const timer = setTimeout(() => {
          saveRoiToServer(selectedCamId, [], zones)
        }, 1500)
        return () => clearTimeout(timer)
      }
    } else {
      prevCamIdRef.current = selectedCamId
    }
  }, [zones, selectedCamId])

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => {
      setNotification(null)
    }, 3500)
  }

  // Active Background Image URL
  const activeImageUrl =
    customCamImage ||
    `${getIngestionApiBase()}/api/v1/line/snapshot/${selectedCamId}?mode=raw&t=${liveSnapshotKey}`

  // Convert Mouse Event coords to SVG Native coordinate system (1600x1200)
  const getSvgCoordinates = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0

    const scaleX = NATIVE_WIDTH / rect.width
    const scaleY = NATIVE_HEIGHT / rect.height

    const x = Math.round((clientX - rect.left) * scaleX)
    const y = Math.round((clientY - rect.top) * scaleY)

    return {
      x: Math.max(0, Math.min(NATIVE_WIDTH, x)),
      y: Math.max(0, Math.min(NATIVE_HEIGHT, y))
    }
  }

  // Handle SVG Canvas Clicks
  const handleSvgClick = (e) => {
    if (dragging) return
    const coords = getSvgCoordinates(e)

    if (isDrawingZone) {
      const nextPoints = [...zoneDraft, coords]
      setZoneDraft(nextPoints)

      if (nextPoints.length === 4) {
        // Complete 4-point zone polygon
        const nextId = `zone_${selectedCamId}_${zoneDrawType}_${Date.now().toString().slice(-4)}`
        const isBike = zoneDrawType === 'motorcycle'
        const existingOfType = zones.filter((z) => z.type === zoneDrawType).length
        const defaultCap = isBike
          ? (selectedCamId === 'cam1' ? 9 : (selectedCamId === 'cam2' ? 13 : 13))
          : (selectedCamId === 'cam1' ? 6 : (selectedCamId === 'cam2' ? 5 : 6))

        const newZone = {
          id: nextId,
          name: isBike
            ? `โซนมอเตอร์ไซค์ ${existingOfType + 1}`
            : `โซนรถยนต์ ${existingOfType + 1}`,
          type: zoneDrawType,
          capacity: defaultCap,
          points: nextPoints
        }

        const updated = [...zones, newZone]
        setZones(updated)
        setZoneDraft([])
        setIsDrawingZone(false)
        setSelectedZoneId(nextId)
        saveZonesToStorage(updated, selectedCamId)
        saveRoiToServer(selectedCamId, [], updated)
        showToast(`สร้าง${newZone.name} (ความจุ ${defaultCap}) เรียบร้อย!`)
      }
    }
  }

  const handleSvgMouseMove = (e) => {
    const coords = getSvgCoordinates(e)
    setCursorPos(coords)

    if (dragging && dragging.type === 'zone_point') {
      const { zoneId, pointIndex } = dragging
      setZones((prev) =>
        prev.map((z) => {
          if (z.id !== zoneId) return z
          const newPts = [...z.points]
          newPts[pointIndex] = coords
          return { ...z, points: newPts }
        })
      )
    }
  }

  const handleSvgMouseUp = () => {
    if (dragging) {
      setDragging(null)
      saveZonesToStorage(zones, selectedCamId)
      saveRoiToServer(selectedCamId, [], zones)
    }
  }

  const handleZonePointMouseDown = (e, zoneId, pointIndex) => {
    e.stopPropagation()
    setSelectedZoneId(zoneId)
    setDragging({ type: 'zone_point', zoneId, pointIndex })
  }

  const handleDeleteZone = (zoneId) => {
    const updated = zones.filter((z) => z.id !== zoneId)
    setZones(updated)
    if (selectedZoneId === zoneId) setSelectedZoneId(null)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated)
    showToast('ลบโซนเรียบร้อยแล้ว', 'info')
  }

  const handleClearAllZones = () => {
    if (window.confirm(`ต้องการล้างโซนทั้งหมดของกล้อง ${activeCam.code} หรือไม่?`)) {
      setZones([])
      setSelectedZoneId(null)
      setZoneDraft([])
      setIsDrawingZone(false)
      saveZonesToStorage([], selectedCamId)
      saveRoiToServer(selectedCamId, [], [])
      showToast(`ล้างโซนทั้งหมดของ ${activeCam.code} เรียบร้อย`, 'info')
    }
  }

  const handleUpdateZoneCapacity = (zoneId, newCap) => {
    const capNum = Math.max(1, parseInt(newCap) || 1)
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, capacity: capNum } : z))
    setZones(updated)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated)
  }

  const handleUpdateZoneName = (zoneId, newName) => {
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, name: newName } : z))
    setZones(updated)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated)
  }

  const handleUpdateZoneType = (zoneId, newType) => {
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, type: newType } : z))
    setZones(updated)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated)
  }

  const handleManualSaveAll = async () => {
    setIsSyncingServer(true)
    saveZonesToStorage(zones, selectedCamId)
    const ok = await saveRoiToServer(selectedCamId, [], zones)
    setIsSyncingServer(false)
    if (ok) {
      showToast(`บันทึกการตั้งค่าโซนของ ${activeCam.code} ไปยัง Server เรียบร้อย!`)
    } else {
      showToast(`บันทึกในเครื่องเรียบร้อย (Server Sync Pending)`, 'info')
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result
      if (dataUrl) {
        setCustomCamImage(dataUrl)
        saveCameraImage(selectedCamId, dataUrl)
        showToast(`อัปโหลดภาพสำหรับ ${activeCam.code} เรียบร้อย!`)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleResetImage = () => {
    setCustomCamImage(null)
    saveCameraImage(selectedCamId, null)
    setLiveSnapshotKey(Date.now())
    showToast(`คืนค่าเป็นภาพสดของกล้อง ${activeCam.code} เรียบร้อย!`)
  }

  // Summary counts
  const carZones = zones.filter((z) => z.type === 'car')
  const bikeZones = zones.filter((z) => z.type === 'motorcycle' || z.type === 'bike')
  const totalCarCap = carZones.reduce((sum, z) => sum + (Number(z.capacity) || 6), 0)
  const totalBikeCap = bikeZones.reduce((sum, z) => sum + (Number(z.capacity) || 9), 0)
  const totalCap = totalCarCap + totalBikeCap

  return (
    <div className="parking-setup-container">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Camera Selection Header */}
      <div className="setup-camera-tabs-bar">
        <div className="camera-tabs-scroll">
          {SYSTEM_CAMERAS.map((cam) => {
            const isCamActive = cam.id === selectedCamId
            const camZones = getSavedOrInitialZones(cam.id)
            const camCars = camZones.filter((z) => z.type === 'car')
            const camBikes = camZones.filter((z) => z.type === 'motorcycle' || z.type === 'bike')
            const cCap = camCars.reduce((s, z) => s + (Number(z.capacity) || 6), 0)
            const bCap = camBikes.reduce((s, z) => s + (Number(z.capacity) || 9), 0)

            return (
              <button
                key={cam.id}
                type="button"
                className={`cam-tab-item ${isCamActive ? 'active' : ''}`}
                onClick={() => setSelectedCamId(cam.id)}
              >
                <div className="cam-tab-title-row">
                  <span className="cam-tab-code">{cam.code}</span>
                  <span className="cam-tab-name">{cam.name}</span>
                </div>
                <div className="cam-tab-stats-row">
                  <span>
                    รถยนต์: <strong>{cCap}</strong> ช่อง • มอไซค์: <strong>{bCap}</strong> คัน
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Work Area: Canvas on Left, Controls on Right */}
      <div className="setup-workspace-grid">
        {/* Left Column: Canvas Viewport & Toolbar */}
        <div className="setup-canvas-panel">
          {/* Top Canvas Toolbar */}
          <div className="canvas-toolbar">
            <div className="toolbar-group flex-wrap gap-2">
              <button
                type="button"
                className={`tool-btn ${!isDrawingZone ? 'active' : ''}`}
                onClick={() => {
                  setIsDrawingZone(false)
                  setZoneDraft([])
                }}
                title="เลือกและปรับแต่งจุดมุมโพลีกอน"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>เลือก / ขยับจุด</span>
              </button>

              <button
                type="button"
                className={`toolbar-segment-btn ${isDrawingZone && zoneDrawType === 'car' ? 'active car-zone' : ''}`}
                onClick={() => {
                  setZoneDrawType('car')
                  setIsDrawingZone(true)
                  setZoneDraft([])
                  setSelectedZoneId(null)
                }}
              >
                <Car className="w-3.5 h-3.5" />
                <span>+ วาดโซนรถยนต์ (Car)</span>
              </button>

              <button
                type="button"
                className={`toolbar-segment-btn ${isDrawingZone && zoneDrawType === 'motorcycle' ? 'active bike-zone' : ''}`}
                onClick={() => {
                  setZoneDrawType('motorcycle')
                  setIsDrawingZone(true)
                  setZoneDraft([])
                  setSelectedZoneId(null)
                }}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>+ วาดโซนมอเตอร์ไซค์ (Bike)</span>
              </button>

              {isDrawingZone && (
                <>
                  <div className="toolbar-instruction-pill drafting">
                    <span>
                      กำลังวาด{zoneDrawType === 'motorcycle' ? 'โซนมอเตอร์ไซค์' : 'โซนรถยนต์'}: คลิกจุดมุมที่ {zoneDraft.length}/4
                    </span>
                  </div>

                  <button
                    type="button"
                    className="tool-btn danger"
                    onClick={() => {
                      setIsDrawingZone(false)
                      setZoneDraft([])
                    }}
                    title="ยกเลิกการวาด"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>ยกเลิก</span>
                  </button>
                </>
              )}
            </div>

            {/* Right Group: Live Camera Actions */}
            <div className="toolbar-group ml-auto">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
              />

              <button
                type="button"
                className="tool-btn highlight"
                onClick={() => {
                  setLiveSnapshotKey(Date.now())
                  fetchCameraLive(selectedCamId)
                  showToast(`ดึงภาพสดล่าสุดจาก ${activeCam.code} เรียบร้อย!`)
                }}
                title={`ดึงภาพ Snapshot สดล่าสุดจาก ${activeCam.code}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>ดึงภาพสด</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={() => fileInputRef.current?.click()}
                title={`อัปโหลดภาพสำหรับ ${activeCam.code}`}
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>อัปโหลดภาพ</span>
              </button>

              {customCamImage && (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={handleResetImage}
                  title="คืนค่ากลับเป็นภาพสดของกล้องนี้"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>คืนค่าภาพสด</span>
                </button>
              )}

              <button
                type="button"
                className={`icon-toggle-btn ${showZoneOverlay ? 'active' : ''}`}
                onClick={() => setShowZoneOverlay(!showZoneOverlay)}
                title="เปิด/ปิด การแสดงกรอบโซน"
              >
                <Layers className={`w-3.5 h-3.5 ${showZoneOverlay ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>Zone Mask</span>
              </button>

              <button
                type="button"
                className={`icon-toggle-btn ${showLabels ? 'active' : ''}`}
                onClick={() => setShowLabels(!showLabels)}
                title="เปิด/ปิด ป้ายชื่อโซน"
              >
                {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>Labels</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="roi-viewport-wrapper polygon" ref={containerRef}>
            {/* Background Image for Active Camera */}
            <img
              src={activeImageUrl}
              alt={`${activeCam.code} Background Feed`}
              className="roi-bg-image"
            />

            {/* SVG Vector Drawing Layer */}
            <svg
              ref={svgRef}
              className="roi-svg-overlay"
              viewBox={`0 0 ${NATIVE_WIDTH} ${NATIVE_HEIGHT}`}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onClick={handleSvgClick}
            >
              {/* 1. Render Confirmed Zone Area Polygons */}
              {showZoneOverlay &&
                zones.map((zone, zIdx) => {
                  const isZoneSelected = zone.id === selectedZoneId
                  const isBikeZone = zone.type === 'motorcycle' || zone.type === 'bike'
                  const ptsStr = zone.points.map((p) => `${p.x},${p.y}`).join(' ')
                  const minX = Math.min(...zone.points.map((p) => p.x))
                  const minY = Math.min(...zone.points.map((p) => p.y))

                  return (
                    <g key={zone.id || zIdx} className="zone-polygon-group">
                      <polygon
                        points={ptsStr}
                        className={`zone-area-polygon ${isBikeZone ? 'bike-zone' : 'car-zone'} ${
                          isZoneSelected ? 'active' : ''
                        }`}
                        pointerEvents="auto"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedZoneId(zone.id)
                        }}
                      />

                      {/* Zone Label Badge */}
                      {showLabels && (
                        <g className="zone-label-group" pointerEvents="none">
                          <rect
                            x={minX + 12}
                            y={minY + 12}
                            width={320}
                            height={34}
                            rx={6}
                            className={`zone-label-bg ${isBikeZone ? 'bike-badge' : ''}`}
                          />
                          <text
                            x={minX + 172}
                            y={minY + 34}
                            textAnchor="middle"
                            className={`zone-label-text ${isBikeZone ? 'bike-text' : ''}`}
                          >
                            {zone.name} (ความจุ {zone.capacity} {isBikeZone ? 'คัน' : 'ช่อง'})
                          </text>
                        </g>
                      )}

                      {/* Zone Vertex Drag Handles (for selected zone) */}
                      {isZoneSelected &&
                        zone.points.map((pt, pIdx) => (
                          <g key={pIdx}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={12}
                              className={`zone-handle-vertex ${isBikeZone ? 'bike-handle' : ''}`}
                              onMouseDown={(e) => handleZonePointMouseDown(e, zone.id, pIdx)}
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 15}
                              textAnchor="middle"
                              className="text-[11px] fill-white font-bold font-mono"
                              pointerEvents="none"
                            >
                              P{pIdx + 1}
                            </text>
                          </g>
                        ))}
                    </g>
                  )
                })}

              {/* 2. Zone In-Progress Drawing Draft Preview */}
              {isDrawingZone && zoneDraft.length > 0 && (
                <g className="zone-draft-group" pointerEvents="none">
                  {zoneDraft.map((pt, pIdx) => (
                    <circle
                      key={pIdx}
                      cx={pt.x}
                      cy={pt.y}
                      r={10}
                      className={`draft-vertex ${zoneDrawType === 'motorcycle' ? 'bike' : 'car'}`}
                    />
                  ))}
                  {zoneDraft.length > 1 && (
                    <polyline
                      points={zoneDraft.map((p) => `${p.x},${p.y}`).join(' ')}
                      className={`draft-line ${zoneDrawType === 'motorcycle' ? 'bike-line' : 'car-line'}`}
                    />
                  )}
                  {/* Dynamic tracking line to cursor */}
                  <line
                    x1={zoneDraft[zoneDraft.length - 1].x}
                    y1={zoneDraft[zoneDraft.length - 1].y}
                    x2={cursorPos.x}
                    y2={cursorPos.y}
                    className="draft-cursor-line"
                  />
                </g>
              )}
            </svg>

            {/* Bottom Meta Status Bar inside Canvas */}
            <div className="viewport-status-footer">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge-tag">
                  {activeCam.code} • {activeCam.name}
                </span>
                <span className="text-slate-400 font-mono">
                  ความจุรวม: <strong className="text-emerald-400">{totalCap}</strong> (รถยนต์: {totalCarCap} • มอไซค์: {totalBikeCap})
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-slate-400">
                <span>
                  Cursor: <strong>X:{cursorPos.x} Y:{cursorPos.y}</strong>
                </span>
                <span>
                  ความละเอียด: <strong>{NATIVE_WIDTH}×{NATIVE_HEIGHT}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Usage Tips Helper */}
          <div className="roi-help-banner">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>คำแนะนำการตั้งค่าโซน (Pure Zone Setup):</strong> กด <strong>"+ วาดโซนรถยนต์"</strong> หรือ <strong>"+ วาดโซนมอเตอร์ไซค์"</strong> แล้วคลิก 4 มุมบนภาพเพื่อสร้างกรอบพื้นที่ จากนั้นลากจุดมุม P1-P4 เพื่อปรับองศา และกรอกจำนวนความจุ (Capacity) ในแถบด้านขวาได้ทันที
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Zone Management Inspector */}
        <div className="setup-inspector-panel">
          <div className="inspector-card zone-card">
            <div className="inspector-card-header">
              <div className="inspector-title">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>กำหนดโซนและจำนวนความจุ • {activeCam.code} ({zones.length} โซน)</span>
              </div>

              {zones.length > 0 && (
                <button
                  type="button"
                  className="btn-icon-action danger"
                  onClick={handleClearAllZones}
                  title="ล้างโซนทั้งหมดของกล้องนี้"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                </button>
              )}
            </div>

            {/* Summary KPIs */}
            <div className="zone-metrics-grid mb-3">
              <div className="zone-metric-tile">
                <span className="zone-metric-label">ความจุรวม</span>
                <span className="zone-metric-val highlight">
                  {totalCap} ช่อง
                </span>
              </div>
              <div className="zone-metric-tile">
                <span className="zone-metric-label">สัดส่วนประเภท</span>
                <span className="zone-metric-val">
                  <span className="text-emerald-400">{totalCarCap} รถ</span>
                  {' • '}
                  <span className="text-cyan-400">{totalBikeCap} มอไซค์</span>
                </span>
              </div>
            </div>

            {zones.length > 0 ? (
              <div className="zone-items-list">
                {zones.map((zone, zIdx) => {
                  const isSelected = selectedZoneId === zone.id
                  const isBike = zone.type === 'motorcycle' || zone.type === 'bike'
                  const areaPx = calculatePolygonArea(zone.points)
                  const areaPct = ((areaPx / (NATIVE_WIDTH * NATIVE_HEIGHT)) * 100).toFixed(1)

                  return (
                    <div
                      key={zone.id || zIdx}
                      className={`zone-item-card ${isSelected ? (isBike ? 'active bike' : 'active car') : ''}`}
                      onClick={() => setSelectedZoneId(zone.id)}
                    >
                      {/* Zone Item Header */}
                      <div className="zone-item-header">
                        <div className="zone-item-title-group flex-1">
                          {isBike ? (
                            <Bike className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <Car className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                          <input
                            type="text"
                            value={zone.name}
                            onChange={(e) => handleUpdateZoneName(zone.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900/90 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-white font-semibold flex-1"
                          />
                          <select
                            value={zone.type}
                            onChange={(e) => handleUpdateZoneType(zone.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-800 text-slate-200 border border-slate-700 text-[11px] rounded px-1.5 py-0.5 font-medium"
                          >
                            <option value="car">รถยนต์</option>
                            <option value="motorcycle">มอเตอร์ไซค์</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="btn-icon-tiny danger ml-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteZone(zone.id)
                          }}
                          title="ลบโซนนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>

                      {/* Zone Capacity Input & Metrics */}
                      <div className="mt-2.5 p-2 rounded bg-slate-900/60 border border-white/5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-semibold text-slate-300">ความจุช่องจอด (คัน):</label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={zone.capacity || (isBike ? 9 : 6)}
                            onChange={(e) => handleUpdateZoneCapacity(zone.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-emerald-400 font-bold text-center"
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {areaPct}% ของภาพ
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Save All Zones Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    className="btn-step-confirm w-full flex items-center justify-center gap-2"
                    onClick={handleManualSaveAll}
                    disabled={isSyncingServer}
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSyncingServer ? 'กำลังบันทึก...' : `บันทึกการตั้งค่าโซน (${activeCam.code})`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-indigo-400/50 mx-auto mb-2 animate-pulse" />
                <h4 className="text-sm font-bold text-indigo-200 mb-1">ยังไม่มีการกำหนดโซน</h4>
                <p className="text-xs text-slate-400 leading-relaxed px-2">
                  คลิก <strong>"+ วาดโซนรถยนต์"</strong> หรือ <strong>"+ วาดโซนมอเตอร์ไซค์"</strong> ด้านบน แล้วคลิก 4 มุมบนภาพเพื่อตีกรอบพื้นที่และระบุความจุช่องจอด
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
