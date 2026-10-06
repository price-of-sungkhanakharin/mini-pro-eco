import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  MousePointer,
  Trash2,
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
  Sliders
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
  FRAMESIZE_RESOLUTIONS,
  scaleZones,
  inferBaseResolution,
  getDefaultZonesForCamera
} from '../../../utils/dumpData'

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

export default function ParkingSetup({ onNavigate, embedded = false, initialCameraId = 'cam1', apiBase: propApiBase }) {
  // Active Camera Selection State (cam1, cam2, cam3)
  const [selectedCamId, setSelectedCamId] = useState(() => initialCameraId || 'cam1')
  const activeCam = getCameraConfig(selectedCamId)

  // Real live camera snapshots and metadata from Ingestion Server
  const [liveSnapshotKey, setLiveSnapshotKey] = useState(() => Date.now())
  const [liveCameraMeta, setLiveCameraMeta] = useState(null)
  const [autoLivePolling, setAutoLivePolling] = useState(false)
  const [isSyncingServer, setIsSyncingServer] = useState(false)

  // Camera Hardware Capture Settings (Framesize & Quality)
  const [camHardwareSettings, setCamHardwareSettings] = useState({
    framesize: 11,
    quality: 10,
    interval_sec: 20
  })

  // Dynamic camera image resolution state (width & height matching the loaded feed or framesize)
  const [imgDimensions, setImgDimensions] = useState(() => {
    const saved = getSavedOrInitialZones(selectedCamId)
    if (saved && saved[0] && saved[0].frame_width && saved[0].frame_height) {
      return { width: saved[0].frame_width, height: saved[0].frame_height }
    }
    return { width: 1280, height: 720 }
  })

  // Custom uploaded/configured snapshot image for current camera
  const [customCamImage, setCustomCamImage] = useState(() => getCameraImage(selectedCamId))

  // Multi-Zone Area Polygons state (AI pixel masks / parking lot boundaries per camera)
  const [zones, setZones] = useState(() => getSavedOrInitialZones(selectedCamId, 1280, 720))
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [zoneDrawType, setZoneDrawType] = useState('car') // 'car' or 'motorcycle'
  const [isDrawingZone, setIsDrawingZone] = useState(false)
  const [zoneDraft, setZoneDraft] = useState([])
  const [showZoneOverlay, setShowZoneOverlay] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  // Vertex dragging state
  const [dragging, setDragging] = useState(null)

  // Notifications
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

  // Fetch camera framesize & quality settings
  const fetchCameraSettings = async (camId) => {
    try {
      const apiBase = getIngestionApiBase()
      const res = await fetch(`${apiBase}/api/settings?camera_id=${camId}`)
      if (res.ok) {
        const data = await res.json()
        if (data && data[camId]) {
          const fs = data[camId].framesize ?? 13
          setCamHardwareSettings({
            framesize: fs,
            quality: data[camId].quality ?? 10,
            interval_sec: data[camId].interval_sec ?? 15
          })
          const defaultRes = FRAMESIZE_RESOLUTIONS[fs]
          if (defaultRes && defaultRes.width) {
            setImgDimensions((prev) => {
              if (prev.width === 1600 && prev.height === 1200 && fs !== 13) {
                return defaultRes
              }
              return prev
            })
          }
        }
      }
    } catch (e) {
      console.warn('Could not load camera settings:', e)
    }
  }

  // Save camera hardware capture settings and dynamically scale existing zones to the target resolution
  const handleSaveHardwareSettings = async (newSettings) => {
    try {
      setIsSyncingServer(true)
      const targetRes = FRAMESIZE_RESOLUTIONS[newSettings.framesize]
      if (targetRes && (targetRes.width !== imgDimensions.width || targetRes.height !== imgDimensions.height)) {
        // Adapt zones to the new target framesize resolution
        const scaled = scaleZones(zones, targetRes.width, targetRes.height, imgDimensions.width, imgDimensions.height)
        setZones(scaled)
        setImgDimensions(targetRes)
        saveZonesToStorage(scaled, selectedCamId)
        await saveRoiToServer(selectedCamId, [], scaled, targetRes.width, targetRes.height)
      }

      const apiBase = getIngestionApiBase()
      await fetch(`${apiBase}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: selectedCamId,
          ...newSettings
        })
      })
      try {
        await fetch('/api/v1/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            camera_id: selectedCamId,
            brightness: 1.0,
            contrast: 1.0,
            rotation: 0,
            ...newSettings
          })
        })
      } catch (err) {}
      showToast(`บันทึก Framesize (${newSettings.framesize}: ${targetRes?.width || ''}x${targetRes?.height || ''}) & Quality (${newSettings.quality}) เรียบร้อย! โซนปรับขนาดตามภาพอัตโนมัติ`)
    } catch (err) {
      showToast('บันทึกการตั้งค่าไม่สำเร็จ', 'error')
    } finally {
      setIsSyncingServer(false)
    }
  }

  // Handle camera background image load: automatically detects physical image pixel dimensions
  const handleImageLoad = (e) => {
    const nw = e.target.naturalWidth
    const nh = e.target.naturalHeight
    if (nw > 0 && nh > 0) {
      setImgDimensions((prev) => {
        if (prev.width !== nw || prev.height !== nh) {
          // Scale zones to match real image resolution
          setZones((prevZones) => {
            const scaled = scaleZones(prevZones, nw, nh, prev.width, prev.height)
            saveZonesToStorage(scaled, selectedCamId, false)
            saveRoiToServer(selectedCamId, [], scaled, nw, nh)
            return scaled
          })
          return { width: nw, height: nh }
        }
        return prev
      })
    }
  }

  // Load live camera feed on mount and when switching cameras
  useEffect(() => {
    fetchCameraLive(selectedCamId)
    fetchCameraSettings(selectedCamId)
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
            const sW = serverCam.frame_width || (serverCam.resolution && serverCam.resolution[0]) || null
            const sH = serverCam.frame_height || (serverCam.resolution && serverCam.resolution[1]) || null
            const scaled = scaleZones(normalized, imgDimensions.width, imgDimensions.height, sW, sH)
            setZones(scaled)
            saveZonesToStorage(scaled, selectedCamId, false)
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
          saveRoiToServer(selectedCamId, [], zones, imgDimensions.width, imgDimensions.height)
        }, 1500)
        return () => clearTimeout(timer)
      }
    } else {
      prevCamIdRef.current = selectedCamId
    }
  }, [zones, selectedCamId, imgDimensions])

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

  // Convert Mouse Event coords to SVG coordinate system (matching active image resolution)
  const getSvgCoordinates = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0

    const scaleX = imgDimensions.width / rect.width
    const scaleY = imgDimensions.height / rect.height

    const x = Math.round((clientX - rect.left) * scaleX)
    const y = Math.round((clientY - rect.top) * scaleY)

    return {
      x: Math.max(0, Math.min(imgDimensions.width, x)),
      y: Math.max(0, Math.min(imgDimensions.height, y))
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
          points: nextPoints,
          points_normalized: nextPoints.map((p) => ({
            x: +(p.x / imgDimensions.width).toFixed(4),
            y: +(p.y / imgDimensions.height).toFixed(4)
          })),
          frame_width: imgDimensions.width,
          frame_height: imgDimensions.height
        }

        const updated = [...zones, newZone]
        setZones(updated)
        setZoneDraft([])
        setIsDrawingZone(false)
        setSelectedZoneId(nextId)
        saveZonesToStorage(updated, selectedCamId)
        saveRoiToServer(selectedCamId, [], updated, imgDimensions.width, imgDimensions.height)
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
          const newNorm = newPts.map((p) => ({
            x: +(p.x / imgDimensions.width).toFixed(4),
            y: +(p.y / imgDimensions.height).toFixed(4)
          }))
          return {
            ...z,
            points: newPts,
            points_normalized: newNorm,
            frame_width: imgDimensions.width,
            frame_height: imgDimensions.height
          }
        })
      )
    }
  }

  const handleSvgMouseUp = () => {
    if (dragging) {
      setDragging(null)
      saveZonesToStorage(zones, selectedCamId)
      saveRoiToServer(selectedCamId, [], zones, imgDimensions.width, imgDimensions.height)
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
    saveRoiToServer(selectedCamId, [], updated, imgDimensions.width, imgDimensions.height)
    showToast('ลบโซนเรียบร้อยแล้ว', 'info')
  }

  const handleClearAllZones = () => {
    if (window.confirm(`ต้องการล้างโซนทั้งหมดของกล้อง ${activeCam.code} หรือไม่?`)) {
      setZones([])
      setSelectedZoneId(null)
      setZoneDraft([])
      setIsDrawingZone(false)
      saveZonesToStorage([], selectedCamId)
      saveRoiToServer(selectedCamId, [], [], imgDimensions.width, imgDimensions.height)
      showToast(`ล้างโซนทั้งหมดของ ${activeCam.code} เรียบร้อย`, 'info')
    }
  }

  const handleUpdateZoneCapacity = (zoneId, newCap) => {
    const capNum = Math.max(1, parseInt(newCap) || 1)
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, capacity: capNum } : z))
    setZones(updated)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated, imgDimensions.width, imgDimensions.height)
  }

  const handleUpdateZoneName = (zoneId, newName) => {
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, name: newName } : z))
    setZones(updated)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated, imgDimensions.width, imgDimensions.height)
  }

  const handleUpdateZoneType = (zoneId, newType) => {
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, type: newType } : z))
    setZones(updated)
    saveZonesToStorage(updated, selectedCamId)
    saveRoiToServer(selectedCamId, [], updated, imgDimensions.width, imgDimensions.height)
  }

  const handleManualSaveAll = async () => {
    setIsSyncingServer(true)
    saveZonesToStorage(zones, selectedCamId)
    const ok = await saveRoiToServer(selectedCamId, [], zones, imgDimensions.width, imgDimensions.height)
    setIsSyncingServer(false)
    if (ok) {
      showToast(`บันทึกการตั้งค่าโซนของ ${activeCam.code} (${imgDimensions.width}x${imgDimensions.height}) ไปยัง Server เรียบร้อย!`)
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

  // Dynamic scaling metrics based on active camera image resolution
  const resScale = imgDimensions.width / 1600
  const vertexRadius = Math.max(8, Math.round(14 * resScale))
  const draftRadius = Math.max(6, Math.round(10 * resScale))
  const labelW = Math.max(180, Math.round(320 * resScale))
  const labelH = Math.max(22, Math.round(34 * resScale))
  const labelFontSize = Math.max(10, Math.round(14 * resScale))

  return (
    <div className="parking-setup-container">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.8} />
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
                <MousePointer className="w-3.5 h-3.5" strokeWidth={1.8} />
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
                <Car className="w-3.5 h-3.5" strokeWidth={1.8} />
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
                <Bike className="w-3.5 h-3.5" strokeWidth={1.8} />
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
                    <X className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span>ยกเลิก</span>
                  </button>
                </>
              )}
            </div>

            {/* Right Group: Live Camera Actions */}
            <div className="toolbar-group ml-auto flex-wrap gap-2">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
              />

              <button
                type="button"
                className="tool-btn"
                onClick={() => {
                  setLiveSnapshotKey(Date.now())
                  fetchCameraLive(selectedCamId)
                  showToast(`ดึงภาพสดล่าสุดจาก ${activeCam.code} เรียบร้อย!`)
                }}
                title={`ดึงภาพ Snapshot สดล่าสุดจาก ${activeCam.code}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--color-green-text)]" strokeWidth={1.8} />
                <span>ดึงภาพสด</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={() => fileInputRef.current?.click()}
                title={`อัปโหลดภาพสำหรับ ${activeCam.code}`}
              >
                <Upload className="w-3.5 h-3.5 text-[var(--color-ink-secondary)]" strokeWidth={1.8} />
                <span>อัปโหลดภาพ</span>
              </button>

              {customCamImage && (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={handleResetImage}
                  title="คืนค่ากลับเป็นภาพสดของกล้องนี้"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--color-ink-secondary)]" strokeWidth={1.8} />
                  <span>คืนค่าภาพสด</span>
                </button>
              )}

              <button
                type="button"
                className={`icon-toggle-btn ${showZoneOverlay ? 'active' : ''}`}
                onClick={() => setShowZoneOverlay(!showZoneOverlay)}
                title="เปิด/ปิด การแสดงกรอบโซน"
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Zone Mask</span>
              </button>

              <button
                type="button"
                className={`icon-toggle-btn ${showLabels ? 'active' : ''}`}
                onClick={() => setShowLabels(!showLabels)}
                title="เปิด/ปิด ป้ายชื่อโซน"
              >
                {showLabels ? <Eye className="w-3.5 h-3.5" strokeWidth={1.8} /> : <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />}
                <span>Labels</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="roi-viewport-wrapper" ref={containerRef}>
            {/* Background Image for Active Camera */}
            <img
              src={activeImageUrl}
              alt={`${activeCam.code} Background Feed`}
              className="roi-bg-image"
              onLoad={handleImageLoad}
            />

            {/* SVG Vector Drawing Layer */}
            <svg
              ref={svgRef}
              className="roi-svg-overlay"
              viewBox={`0 0 ${imgDimensions.width} ${imgDimensions.height}`}
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
                            x={minX + 8}
                            y={minY + 8}
                            width={labelW}
                            height={labelH}
                            rx={4}
                            className={`zone-label-bg ${isBikeZone ? 'bike-badge' : ''}`}
                          />
                          <text
                            x={minX + 8 + labelW / 2}
                            y={minY + 8 + labelH * 0.68}
                            textAnchor="middle"
                            className={`zone-label-text ${isBikeZone ? 'bike-text' : ''}`}
                            style={{ fontSize: `${labelFontSize}px` }}
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
                              r={vertexRadius}
                              className={`zone-handle-vertex ${isBikeZone ? 'bike-handle' : ''}`}
                              onMouseDown={(e) => handleZonePointMouseDown(e, zone.id, pIdx)}
                            />
                            <text
                              x={pt.x}
                              y={pt.y - vertexRadius - 4}
                              textAnchor="middle"
                              className="fill-[var(--color-ink)] font-bold font-mono"
                              style={{ fontSize: `${Math.max(10, vertexRadius)}px` }}
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
                      r={draftRadius}
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
                <span className="text-[var(--color-ink-secondary)] font-mono text-xs">
                  ความจุรวม: <strong className="text-[var(--color-green-text)] font-semibold">{totalCap}</strong> (รถยนต์: {totalCarCap} • มอไซค์: {totalBikeCap})
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[var(--color-ink-secondary)] text-xs">
                <span>
                  Cursor: <strong className="text-[var(--color-ink)] font-semibold">X:{cursorPos.x} Y:{cursorPos.y}</strong>
                </span>
                <span>
                  ความละเอียด: <strong className="text-[var(--color-ink)] font-semibold">{imgDimensions.width}×{imgDimensions.height}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Usage Tips Helper */}
          <div className="roi-help-banner">
            <div className="flex items-center gap-2 text-xs text-[var(--color-ink-secondary)]">
              <Sparkles className="w-4 h-4 text-[var(--color-green-text)] shrink-0" strokeWidth={1.8} />
              <span>
                <strong className="text-[var(--color-ink)]">ระบบวาดโซนแบบไดนามิก (Dynamic Resolution Support):</strong> กรอบโซนจะปรับสัดส่วนอัตโนมัติตามความละเอียดของกล้อง ({imgDimensions.width}×{imgDimensions.height} px) เมื่อเปลี่ยน Framesize หรือดึงภาพสด โซนจะสเกลตามทันที และสามารถคลิกหรือลากจุด P1-P4 เพื่อปรับแต่งได้อิสระ
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Zone Management Inspector */}
        <div className="setup-inspector-panel">
          <div className="inspector-card">
            <div className="inspector-card-header">
              <div className="inspector-title">
                <Layers className="w-4 h-4 text-[var(--color-ink)]" strokeWidth={1.8} />
                <span>กำหนดโซนและจำนวนความจุ • {activeCam.code} ({zones.length} โซน)</span>
              </div>

              {zones.length > 0 && (
                <button
                  type="button"
                  className="btn-icon-action danger"
                  onClick={handleClearAllZones}
                  title="ล้างโซนทั้งหมดของกล้องนี้"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[var(--color-status-full-text)]" strokeWidth={1.8} />
                </button>
              )}
            </div>

            {/* Summary KPIs */}
            <div className="zone-metrics-grid mb-3">
              <div className="zone-metric-tile">
                <span className="zone-metric-label">ความจุรวม</span>
                <span className="zone-metric-val">
                  {totalCap} ช่อง
                </span>
              </div>
              <div className="zone-metric-tile">
                <span className="zone-metric-label">สัดส่วนประเภท</span>
                <span className="zone-metric-val">
                  <span className="text-[var(--color-green-text)]">{totalCarCap} รถ</span>
                  {' • '}
                  <span className="text-[var(--color-ink)]">{totalBikeCap} มอไซค์</span>
                </span>
              </div>
            </div>

            {zones.length > 0 ? (
              <div className="zone-items-list">
                {zones.map((zone, zIdx) => {
                  const isSelected = selectedZoneId === zone.id
                  const isBike = zone.type === 'motorcycle' || zone.type === 'bike'
                  const areaPx = calculatePolygonArea(zone.points)
                  const areaPct = ((areaPx / (imgDimensions.width * imgDimensions.height)) * 100).toFixed(1)

                  return (
                    <div
                      key={zone.id || zIdx}
                      className={`zone-item-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedZoneId(zone.id)}
                    >
                      {/* Zone Item Header */}
                      <div className="zone-item-header">
                        <div className="zone-item-title-group flex-1 flex items-center gap-2">
                          {isBike ? (
                            <Bike className="w-4 h-4 text-[var(--color-ink)] shrink-0" strokeWidth={1.8} />
                          ) : (
                            <Car className="w-4 h-4 text-[var(--color-ink)] shrink-0" strokeWidth={1.8} />
                          )}
                          <input
                            type="text"
                            value={zone.name}
                            onChange={(e) => handleUpdateZoneName(zone.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="zone-name-input"
                          />
                          <select
                            value={zone.type}
                            onChange={(e) => handleUpdateZoneType(zone.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="zone-type-select"
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
                          <Trash2 className="w-3.5 h-3.5 text-[var(--color-status-full-text)]" strokeWidth={1.8} />
                        </button>
                      </div>

                      {/* Zone Capacity Input & Metrics */}
                      <div className="zone-item-capacity-row">
                        <div className="flex items-center gap-2">
                          <label className="text-[12px] font-medium text-[var(--color-ink-secondary)]">ความจุช่องจอด (คัน):</label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={zone.capacity || (isBike ? 9 : 6)}
                            onChange={(e) => handleUpdateZoneCapacity(zone.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="zone-cap-input"
                          />
                        </div>
                        <span className="text-[11px] text-[var(--color-ink-secondary)] font-mono">
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
                    <Save className="w-4 h-4" strokeWidth={1.8} />
                    <span>
                      {isSyncingServer ? 'กำลังบันทึก...' : `บันทึกการตั้งค่าโซน (${activeCam.code})`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-[var(--color-ink-muted)] mx-auto mb-2" strokeWidth={1.5} />
                <h4 className="text-sm font-semibold text-[var(--color-ink)] mb-1">ยังไม่มีการกำหนดโซน</h4>
                <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed px-2">
                  คลิก <strong className="text-[var(--color-ink)]">"+ วาดโซนรถยนต์"</strong> หรือ <strong className="text-[var(--color-ink)]">"+ วาดโซนมอเตอร์ไซค์"</strong> ด้านบน แล้วคลิก 4 มุมบนภาพเพื่อตีกรอบพื้นที่และระบุความจุช่องจอด
                </p>
              </div>
            )}
          </div>

          {/* Camera Frame Size & Quality Control Box */}
          <div className="inspector-card mt-3">
            <div className="inspector-card-header">
              <div className="inspector-title">
                <Sliders className="w-4 h-4 text-[var(--color-ink)]" strokeWidth={1.8} />
                <span>ฮาร์ดแวร์กล้อง ({activeCam.code} Capture Settings)</span>
              </div>
            </div>

            <div className="p-3 bg-[var(--color-card)] flex flex-col gap-2.5">
              <div className="form-group-setup">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-medium text-[var(--color-ink-secondary)]">
                    Camera Frame Size (ESP32 ID):
                  </label>
                  <span className="text-[11px] font-mono text-[var(--color-green-text)] font-semibold">
                    {imgDimensions.width}×{imgDimensions.height} px
                  </span>
                </div>
                <select
                  value={camHardwareSettings.framesize}
                  onChange={(e) =>
                    setCamHardwareSettings((prev) => ({
                      ...prev,
                      framesize: Number(e.target.value)
                    }))
                  }
                  className="w-full text-xs font-mono py-1.5 px-2 bg-white border-2 border-[var(--color-border)] rounded shadow-[2px_2px_0px_#212529]"
                >
                  <option value={13}>13: UXGA (1600x1200) - Default</option>
                  <option value={12}>12: SXGA (1280x1024)</option>
                  <option value={11}>11: HD (1280x720) - 16:9 Widescreen</option>
                  <option value={10}>10: XGA (1024x768)</option>
                  <option value={9}>9: SVGA (800x600)</option>
                </select>
              </div>

              <div className="form-group-setup">
                <label className="text-[12px] font-medium text-[var(--color-ink-secondary)]">
                  JPEG Quality (1-63, 10 = ละเอียดสูง):
                </label>
                <input
                  type="number"
                  min="1"
                  max="63"
                  value={camHardwareSettings.quality}
                  onChange={(e) =>
                    setCamHardwareSettings((prev) => ({
                      ...prev,
                      quality: Number(e.target.value)
                    }))
                  }
                  className="w-full text-xs font-mono py-1.5 px-2 bg-white border-2 border-[var(--color-border)] rounded shadow-[2px_2px_0px_#212529]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSaveHardwareSettings(camHardwareSettings)}
                className="btn-step-confirm mt-1 w-full flex items-center justify-center gap-2 py-1.5 text-xs"
                disabled={isSyncingServer}
              >
                <Save className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>
                  {isSyncingServer ? 'กำลังบันทึก...' : `บันทึก Framesize & Quality (${activeCam.code})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
