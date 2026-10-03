import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  Square,
  Pentagon,
  MousePointer,
  Trash2,
  Download,
  Copy,
  Upload,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  Car,
  Bike,
  Sparkles,
  Info,
  Layers,
  CheckCircle2,
  Video,
  Camera,
  Image as ImageIcon,
  RefreshCw,
  Save,
  HardDrive,
  Wifi,
  Thermometer,
  CloudUpload,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import {
  loadDumpMetadata,
  DEFAULT_CAM1_SLOTS,
  SYSTEM_CAMERAS,
  getCameraConfig,
  getDefaultSlotsForCamera,
  getSavedOrInitialSlots,
  saveSlotsToStorage,
  resetCameraSlots,
  getCameraImage,
  saveCameraImage,
  calculateSlotCounts,
  formatTimestampThai,
  getIngestionApiBase,
  saveRoiToServer,
  saveAllCamerasRoiToServer,
  fetchRoiFromServer,
  isDummyTestSlot,
  getSavedOrInitialZones,
  saveZonesToStorage,
  resetCameraZone,
  getDefaultZoneForCamera,
  formatPolygonForServer,
  parsePolygonFromServer,
  isDummyTestZone,
  normalizeZones
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

  // Step 1: Draw Parking Zones | Step 2: Draw Individual Slots
  const [setupStep, setSetupStep] = useState(1)

  // Real live camera snapshots and metadata from Ingestion Server & MinIO
  const [liveSnapshotKey, setLiveSnapshotKey] = useState(() => Date.now())
  const [liveCameraMeta, setLiveCameraMeta] = useState(null)
  const [recentFrames, setRecentFrames] = useState([])
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(-1) // -1 = live real-time snapshot
  const [autoLivePolling, setAutoLivePolling] = useState(false)
  const [isSyncingServer, setIsSyncingServer] = useState(false)

  // Custom uploaded/configured snapshot image for current camera
  const [customCamImage, setCustomCamImage] = useState(() => getCameraImage(selectedCamId))

  // Step 2 Drawing Tools: 'select', 'polygon' (4 points), 'bbox' (drag rectangle)
  const [currentTool, setCurrentTool] = useState('polygon')
  // Drawing Vehicle Type: 'car' or 'motorcycle'
  const [drawType, setDrawType] = useState('car')

  // Slots state - synchronized with shared localStorage for active camera
  const [slots, setSlots] = useState(() => getSavedOrInitialSlots(selectedCamId))

  // Multi-Zone Area Polygons state (AI pixel masks / parking lot boundaries per camera)
  const [zones, setZones] = useState(() => getSavedOrInitialZones(selectedCamId))
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [zoneDrawType, setZoneDrawType] = useState('car') // 'car' or 'motorcycle'
  const [zoneDraft, setZoneDraft] = useState([])
  const [showZoneOverlay, setShowZoneOverlay] = useState(true)

  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [nextSlotPrefix, setNextSlotPrefix] = useState(activeCam.defaultCarPrefix)

  // Active Polygon drawing state for individual slot (for 4-point clicks)
  const [polygonDraft, setPolygonDraft] = useState([])
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  // Active BBox drag state
  const [bboxDragStart, setBboxDragStart] = useState(null)
  const [bboxDragCurrent, setBboxDragCurrent] = useState(null)

  // Vertex or Shape dragging state
  const [dragging, setDragging] = useState(null)

  // Viewport display controls
  const [showLabels, setShowLabels] = useState(true)

  // Modals & Notifications
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [notification, setNotification] = useState(null)

  const fileInputRef = useRef(null)
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const prevCamIdRef = useRef(selectedCamId)

  // Fetch real-time live camera information and recent MinIO snapshot frames
  const fetchCameraLive = async (camId) => {
    const apiBase = getIngestionApiBase()
    const targetCam = camId || selectedCamId
    try {
      // 1. Fetch latest metadata & telemetry for this camera
      const latestRes = await fetch(`${apiBase}/api/latest?camera_id=${targetCam}`)
      if (latestRes.ok) {
        const latestData = await latestRes.json()
        setLiveCameraMeta(latestData)
      }

      // 2. Fetch latest historical frames list for this camera from MinIO/DB
      const logsRes = await fetch(`${apiBase}/api/logs?camera_id=${targetCam}&limit=12`)
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        if (Array.isArray(logsData.records)) {
          setRecentFrames(logsData.records)
        }
      }
    } catch (err) {
      console.warn('Could not fetch live camera info:', err)
    }
  }

  // Load live camera feed on mount and when switching cameras
  useEffect(() => {
    fetchCameraLive(selectedCamId)
    setSelectedFrameIndex(-1)
    setLiveSnapshotKey(Date.now())
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
      handleSwitchCamera(initialCameraId)
    }
  }, [initialCameraId])

  // Fetch real ROI slots and zones from server when camera changes or on mount
  useEffect(() => {
    let isMounted = true
    const loadServerRoi = async () => {
      try {
        const roiData = await fetchRoiFromServer(selectedCamId)
        if (!isMounted) return
        const serverCam = roiData ? (roiData[selectedCamId] || roiData[activeCam.location]) : null
        if (serverCam && Array.isArray(serverCam.slots) && serverCam.slots.length > 0) {
          if (!isDummyTestSlot(serverCam.slots)) {
            setSlots(serverCam.slots)
            saveSlotsToStorage(serverCam.slots, selectedCamId, false)
          } else {
            const localSlots = getSavedOrInitialSlots(selectedCamId)
            if (!isDummyTestSlot(localSlots)) {
              saveRoiToServer(selectedCamId, localSlots, zones)
            }
          }
        }
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

  // Auto-save slots and zones to localStorage & debounced sync to server whenever slots or zones change
  useEffect(() => {
    if (prevCamIdRef.current === selectedCamId) {
      saveSlotsToStorage(slots, selectedCamId)
      saveZonesToStorage(zones, selectedCamId)

      // Debounced auto-sync to central server (1.5s after editing)
      if (slots.length > 0 || zones.length > 0) {
        const timer = setTimeout(() => {
          saveRoiToServer(selectedCamId, slots, zones)
        }, 1500)
        return () => clearTimeout(timer)
      }
    } else {
      prevCamIdRef.current = selectedCamId
    }
  }, [slots, zones, selectedCamId])

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => {
      setNotification(null)
    }, 3500)
  }

  // Handle switching active camera
  const handleSwitchCamera = (newCamId) => {
    if (newCamId === selectedCamId) return
    // 1. Save current camera's slots and zones before switching
    saveSlotsToStorage(slots, selectedCamId)
    saveZonesToStorage(zones, selectedCamId)

    // 2. Load target camera
    const nextCam = getCameraConfig(newCamId)
    setSelectedCamId(newCamId)
    prevCamIdRef.current = newCamId
    const loadedSlots = getSavedOrInitialSlots(newCamId)
    const loadedZones = getSavedOrInitialZones(newCamId)
    setSlots(loadedSlots)
    setZones(loadedZones)
    setSelectedZoneId(loadedZones.length > 0 ? loadedZones[0].id : null)
    setCustomCamImage(getCameraImage(newCamId))
    setSelectedFrameIndex(-1)
    setLiveSnapshotKey(Date.now())

    // 3. Reset editor drawing & selection state
    setSelectedSlotId(null)
    setPolygonDraft([])
    setZoneDraft([])
    setBboxDragStart(null)
    setBboxDragCurrent(null)
    setDragging(null)
    setNextSlotPrefix(drawType === 'motorcycle' ? nextCam.defaultBikePrefix : nextCam.defaultCarPrefix)

    // If no zones exist yet for this camera, start in Step 1
    if (!loadedZones || loadedZones.length === 0) {
      setSetupStep(1)
    }
    showToast(`สลับไปยัง ${nextCam.code} (${nextCam.name}) เรียบร้อย`)
  }

  // Handle save ROI to server & AI detection worker
  const handleSaveRoiToServer = async () => {
    setIsSyncingServer(true)
    saveSlotsToStorage(slots, selectedCamId)
    saveZonesToStorage(zones, selectedCamId)
    const ok = await saveRoiToServer(selectedCamId, slots, zones)
    setIsSyncingServer(false)
    if (ok) {
      showToast(`บันทึกพิกัด ROI & โซนลานจอดกล้อง ${activeCam.code} (${zones.length} โซน, ${slots.length} ช่อง) ไปยัง PostgreSQL สำเร็จ!`)
    } else {
      showToast(`บันทึกใน LocalStorage เรียบร้อย (Server ตอบกลับไม่สำเร็จ)`, 'info')
    }
  }

  // Handle save and sync all 3 cameras ROI & Zones to server at once
  const handleSaveAllCamerasToServer = async () => {
    setIsSyncingServer(true)
    saveSlotsToStorage(slots, selectedCamId)
    saveZonesToStorage(zones, selectedCamId)
    const ok = await saveAllCamerasRoiToServer()
    setIsSyncingServer(false)
    if (ok) {
      showToast(`ซิงค์พิกัด ROI และโซนลานจอดทั้ง 3 กล้องขึ้น PostgreSQL สำเร็จ! ทุกเครื่องจะเห็นตรงกันทันที`, 'success')
    } else {
      showToast(`บันทึกใน LocalStorage แล้ว แต่การเชื่อมต่อ Server ขัดข้อง`, 'info')
    }
  }

  // Handle image upload from user device (ESP32-CAM snapshot or phone photo)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (dataUrl) {
        setCustomCamImage(dataUrl)
        saveCameraImage(selectedCamId, dataUrl)
        showToast(`อัปโหลดภาพสำหรับกล้อง ${activeCam.code} เรียบร้อยแล้ว!`)
      }
    }
    reader.readAsDataURL(file)
  }

  // Reset custom image back to live camera feed
  const handleResetImage = () => {
    setCustomCamImage(null)
    saveCameraImage(selectedCamId, null)
    setSelectedFrameIndex(-1)
    setLiveSnapshotKey(Date.now())
    fetchCameraLive(selectedCamId)
    showToast(`คืนค่าภาพเป็นภาพสดเรียลไทม์ของกล้อง ${activeCam.code} เรียบร้อย`)
  }

  // Add default bike slots if empty
  const handleAddDefaultBikes = () => {
    const bikeSlots = getDefaultSlotsForCamera(selectedCamId).filter(
      (s) => s.type === 'motorcycle' || s.type === 'bike'
    )
    if (bikeSlots.length === 0) {
      const newId = `${activeCam.defaultBikePrefix}01`
      const newBikeSlot = {
        id: newId,
        type: 'motorcycle',
        shape: 'polygon',
        occupied: false,
        vehicle_name: 'ว่างพร้อมจอด',
        points: [
          { x: 120, y: 550 },
          { x: 230, y: 550 },
          { x: 220, y: 680 },
          { x: 110, y: 680 }
        ],
        bbox: { x: 110, y: 550, width: 120, height: 130 }
      }
      setSlots((prev) => [...prev, newBikeSlot])
      showToast(`สร้างช่องมอเตอร์ไซค์ ${newId} เรียบร้อยแล้ว`)
      return
    }

    setSlots((prev) => {
      const existingIds = new Set(prev.map((s) => s.id))
      const toAdd = bikeSlots.filter((s) => !existingIds.has(s.id))
      if (toAdd.length === 0) {
        showToast(`มีช่องจอดมอเตอร์ไซค์ของ ${activeCam.code} อยู่แล้ว`, 'info')
        return prev
      }
      showToast(`เพิ่มช่องมอเตอร์ไซค์ ${toAdd.map((s) => s.id).join(', ')} เรียบร้อยแล้ว!`)
      return [...prev, ...toAdd]
    })
  }

  // Compute active background image URL
  const apiBase = getIngestionApiBase()
  const currentSelectedFrame = selectedFrameIndex >= 0 ? recentFrames[selectedFrameIndex] : null
  const activeImageUrl =
    customCamImage ||
    (currentSelectedFrame
      ? currentSelectedFrame.image_url
      : `${apiBase}/api/latest?camera_id=${selectedCamId}&image=true&t=${liveSnapshotKey}`)

  // Current background image info for meta display
  const currentRecord = {
    camera_id: selectedCamId,
    location_name: activeCam.name,
    filename: customCamImage
      ? 'custom_uploaded_snapshot.jpg'
      : currentSelectedFrame
      ? currentSelectedFrame.filename
      : liveCameraMeta?.stats?.latest_filename || `${selectedCamId}_live_stream.jpg`,
    local_time: currentSelectedFrame
      ? currentSelectedFrame.local_time
      : liveCameraMeta?.stats?.latest_timestamp
      ? liveCameraMeta.stats.latest_timestamp.replace('T', ' ').split('.')[0]
      : 'ภาพสดเรียลไทม์ (Live)',
    minio_url: currentSelectedFrame
      ? currentSelectedFrame.minio_url
      : liveCameraMeta?.stats?.minio_latest_path
      ? `s3://raw-datasets/${liveCameraMeta.stats.minio_latest_path}`
      : `s3://raw-datasets/dataset/${selectedCamId}/...`,
    client_ip: currentSelectedFrame
      ? currentSelectedFrame.client_ip
      : liveCameraMeta?.telemetry?.client_ip || (selectedCamId === 'cam1' ? '172.30.91.44' : selectedCamId === 'cam2' ? '172.30.92.108' : '172.30.92.100'),
    chip_temp: currentSelectedFrame
      ? currentSelectedFrame.chip_temp_c
      : liveCameraMeta?.telemetry?.telemetry?.chip_temp_c || liveCameraMeta?.telemetry?.chip_temp_c || 53.3,
    wifi_rssi: currentSelectedFrame
      ? currentSelectedFrame.wifi_rssi_dbm
      : liveCameraMeta?.telemetry?.telemetry?.wifi_rssi_dbm || -80,
    image_url: activeImageUrl
  }

  // Generate next automatic slot ID according to active camera prefix
  const getNextSlotId = (overrideType) => {
    const activeType = overrideType || drawType
    const prefix =
      activeType === 'motorcycle'
        ? activeCam.defaultBikePrefix
        : nextSlotPrefix || activeCam.defaultCarPrefix

    const existingNums = slots
      .map((s) => {
        const match = s.id.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((n) => n > 0)

    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0
    const nextNum = maxNum + 1
    return `${prefix}${nextNum.toString().padStart(2, '0')}`
  }

  // Convert client mouse event to native SVG coordinates (0..1600, 0..1200)
  const getSvgCoordinates = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.clientX
    const clientY = e.clientY

    const scaleX = NATIVE_WIDTH / rect.width
    const scaleY = NATIVE_HEIGHT / rect.height

    const x = Math.round((clientX - rect.left) * scaleX)
    const y = Math.round((clientY - rect.top) * scaleY)

    return {
      x: Math.max(0, Math.min(NATIVE_WIDTH, x)),
      y: Math.max(0, Math.min(NATIVE_HEIGHT, y))
    }
  }

  // Handle SVG Mouse Down
  const handleSvgMouseDown = (e) => {
    if (e.button !== 0) return // Left click only
    const pt = getSvgCoordinates(e)

    if (setupStep === 2 && currentTool === 'bbox') {
      setBboxDragStart(pt)
      setBboxDragCurrent(pt)
      setSelectedSlotId(null)
    }
  }

  // Handle SVG Mouse Move
  const handleSvgMouseMove = (e) => {
    const pt = getSvgCoordinates(e)
    setCursorPos(pt)

    // BBox dragging in progress (Step 2)
    if (setupStep === 2 && currentTool === 'bbox' && bboxDragStart) {
      setBboxDragCurrent(pt)
    }

    // Vertex dragging in progress
    if (dragging) {
      if (dragging.type === 'point') {
        const { slotId, pointIndex } = dragging
        setSlots((prev) =>
          prev.map((s) => {
            if (s.id !== slotId) return s
            const newPoints = [...s.points]
            newPoints[pointIndex] = pt
            const xs = newPoints.map((p) => p.x)
            const ys = newPoints.map((p) => p.y)
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)
            return {
              ...s,
              points: newPoints,
              bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
            }
          })
        )
      } else if (dragging.type === 'shape') {
        const { slotId, startX, startY, initialPoints } = dragging
        const dx = pt.x - startX
        const dy = pt.y - startY

        setSlots((prev) =>
          prev.map((s) => {
            if (s.id !== slotId) return s
            const newPoints = initialPoints.map((p) => ({
              x: Math.max(0, Math.min(NATIVE_WIDTH, Math.round(p.x + dx))),
              y: Math.max(0, Math.min(NATIVE_HEIGHT, Math.round(p.y + dy)))
            }))
            const xs = newPoints.map((p) => p.x)
            const ys = newPoints.map((p) => p.y)
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)
            return {
              ...s,
              points: newPoints,
              bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
            }
          })
        )
      } else if (dragging.type === 'zone_point') {
        const { zoneId, pointIndex } = dragging
        setZones((prev) =>
          prev.map((z) => {
            if (z.id !== zoneId) return z
            const nextPts = [...z.points]
            nextPts[pointIndex] = pt
            return { ...z, points: nextPts }
          })
        )
      } else if (dragging.type === 'zone_shape') {
        const { zoneId, startX, startY, initialPoints } = dragging
        const dx = pt.x - startX
        const dy = pt.y - startY
        setZones((prev) =>
          prev.map((z) => {
            if (z.id !== zoneId) return z
            return {
              ...z,
              points: initialPoints.map((p) => ({
                x: Math.max(0, Math.min(NATIVE_WIDTH, Math.round(p.x + dx))),
                y: Math.max(0, Math.min(NATIVE_HEIGHT, Math.round(p.y + dy)))
              }))
            }
          })
        )
      }
    }
  }

  // Handle SVG Mouse Up
  const handleSvgMouseUp = () => {
    if (dragging) {
      setDragging(null)
      return
    }

    // Finish BBox Dragging (Step 2)
    if (setupStep === 2 && currentTool === 'bbox' && bboxDragStart && bboxDragCurrent) {
      const minX = Math.min(bboxDragStart.x, bboxDragCurrent.x)
      const maxX = Math.max(bboxDragStart.x, bboxDragCurrent.x)
      const minY = Math.min(bboxDragStart.y, bboxDragCurrent.y)
      const maxY = Math.max(bboxDragStart.y, bboxDragCurrent.y)
      const width = maxX - minX
      const height = maxY - minY

      // Ignore accidental tiny clicks
      if (width > 20 && height > 20) {
        const newId = getNextSlotId()
        const newSlot = {
          id: newId,
          type: drawType,
          shape: 'bbox',
          occupied: false,
          vehicle_name: 'ว่างพร้อมจอด',
          points: [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY }
          ],
          bbox: { x: minX, y: minY, width, height }
        }
        setSlots((prev) => [...prev, newSlot])
        setSelectedSlotId(newId)
        showToast(`เพิ่มช่องจอด ${newId} (${drawType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'} Box) เรียบร้อยแล้ว`)
      }

      setBboxDragStart(null)
      setBboxDragCurrent(null)
    }
  }

  // Handle SVG Click
  const handleSvgClick = (e) => {
    const pt = getSvgCoordinates(e)

    // ==========================================
    // STEP 1: Drawing Parking Zone Mask (Multi-Zone)
    // ==========================================
    if (setupStep === 1) {
      // If clicking to close polygon (clicked near first point or 4th point reached)
      if (zoneDraft.length >= 3) {
        const first = zoneDraft[0]
        const dist = Math.hypot(pt.x - first.x, pt.y - first.y)
        if (dist < 35 || zoneDraft.length === 3) {
          const finalPoints = zoneDraft.length === 3 ? [...zoneDraft, pt] : zoneDraft
          const typeLabel = zoneDrawType === 'motorcycle' ? 'โซนมอเตอร์ไซค์' : 'โซนรถยนต์'
          const countOfType = zones.filter((z) => z.type === zoneDrawType).length + 1
          const newZone = {
            id: `zone_${Date.now()}`,
            name: `${typeLabel} ${countOfType}`,
            type: zoneDrawType,
            points: finalPoints
          }
          const nextZones = [...zones, newZone]
          setZones(nextZones)
          setSelectedZoneId(newZone.id)
          saveZonesToStorage(nextZones, selectedCamId)
          setZoneDraft([])
          showToast(`สร้าง${newZone.name} (${finalPoints.length} จุดมุม) สำเร็จ! สามารถเพิ่มโซนอื่นต่อได้`)
          return
        }
      }
      setZoneDraft((prev) => [...prev, pt])
      return
    }

    // ==========================================
    // STEP 2: Drawing Individual Slot (Car/Bike)
    // ==========================================
    if (setupStep === 2 && currentTool === 'polygon') {
      const updatedDraft = [...polygonDraft, pt]

      if (updatedDraft.length < 4) {
        setPolygonDraft(updatedDraft)
      } else {
        // Completed 4-point slot polygon!
        const newId = getNextSlotId()
        const xs = updatedDraft.map((p) => p.x)
        const ys = updatedDraft.map((p) => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const newSlot = {
          id: newId,
          type: drawType,
          shape: 'polygon',
          occupied: false,
          vehicle_name: 'ว่างพร้อมจอด',
          points: updatedDraft,
          bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
        }

        setSlots((prev) => [...prev, newSlot])
        setSelectedSlotId(newId)
        setPolygonDraft([])
        showToast(`สร้างช่องจอด ${newId} (${drawType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'}) สำเร็จ!`)
      }
    }
  }

  // Cancel in-progress polygon draft for slot
  const handleCancelPolygon = () => {
    setPolygonDraft([])
    showToast('ยกเลิกการวาดช่องจอดแล้ว', 'info')
  }

  // Complete zone drafting manually via button
  const handleFinishZoneDraft = () => {
    if (zoneDraft.length < 3) {
      showToast('กรุณาคลิกอย่างน้อย 3 จุดเพื่อสร้างกรอบโซนพื้นที่จอด', 'info')
      return
    }
    const typeLabel = zoneDrawType === 'motorcycle' ? 'โซนมอเตอร์ไซค์' : 'โซนรถยนต์'
    const countOfType = zones.filter((z) => z.type === zoneDrawType).length + 1
    const newZone = {
      id: `zone_${Date.now()}`,
      name: `${typeLabel} ${countOfType}`,
      type: zoneDrawType,
      points: zoneDraft
    }
    const nextZones = [...zones, newZone]
    setZones(nextZones)
    setSelectedZoneId(newZone.id)
    saveZonesToStorage(nextZones, selectedCamId)
    setZoneDraft([])
    showToast(`บันทึก${newZone.name} (${zoneDraft.length} จุด) สำเร็จ!`)
  }

  // Cancel zone draft
  const handleCancelZoneDraft = () => {
    setZoneDraft([])
    showToast('ยกเลิกการวาดโซนแล้ว', 'info')
  }

  // Delete a specific zone
  const handleDeleteZone = (zoneId) => {
    const updated = zones.filter((z) => z.id !== zoneId)
    setZones(updated)
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(updated.length > 0 ? updated[0].id : null)
    }
    saveZonesToStorage(updated, selectedCamId)
    showToast('ลบโซนที่เลือกเรียบร้อย')
  }

  // Clear all zones completely
  const handleClearAllZones = () => {
    setZones([])
    setSelectedZoneId(null)
    saveZonesToStorage([], selectedCamId)
    setZoneDraft([])
    showToast(`ล้างโซนทั้งหมดของ ${activeCam.code} แล้ว`)
  }

  // Handle Zone vertex mouse down
  const handleZonePointMouseDown = (e, zoneId, pointIndex) => {
    e.stopPropagation()
    setSelectedZoneId(zoneId)
    setDragging({ type: 'zone_point', zoneId, pointIndex })
  }

  // Handle Zone shape mouse down
  const handleZoneShapeMouseDown = (e, zone) => {
    if (currentTool !== 'select' && setupStep !== 1) return
    e.stopPropagation()
    setSelectedZoneId(zone.id)
    const pt = getSvgCoordinates(e)
    setDragging({
      type: 'zone_shape',
      zoneId: zone.id,
      startX: pt.x,
      startY: pt.y,
      initialPoints: zone.points.map((p) => ({ ...p }))
    })
  }

  // Delete specific vertex from selected zone
  const handleDeleteZonePoint = (zoneId, pIdx) => {
    const targetZone = zones.find((z) => z.id === zoneId)
    if (!targetZone || targetZone.points.length <= 3) {
      showToast('โซนต้องมีอย่างน้อย 3 จุดพิกัด', 'info')
      return
    }
    const updatedPoints = targetZone.points.filter((_, i) => i !== pIdx)
    const updatedZones = zones.map((z) => (z.id === zoneId ? { ...z, points: updatedPoints } : z))
    setZones(updatedZones)
    saveZonesToStorage(updatedZones, selectedCamId)
    showToast(`ลบจุดมุม P${pIdx + 1} เรียบร้อย`)
  }

  // Slot point handle drag start
  const handlePointMouseDown = (e, slotId, pointIndex) => {
    e.stopPropagation()
    setSelectedSlotId(slotId)
    setDragging({ type: 'point', slotId, pointIndex })
  }

  // Entire slot drag start (in Select mode)
  const handleShapeMouseDown = (e, slot) => {
    if (currentTool !== 'select') return
    e.stopPropagation()
    setSelectedSlotId(slot.id)
    const pt = getSvgCoordinates(e)
    setDragging({
      type: 'shape',
      slotId: slot.id,
      startX: pt.x,
      startY: pt.y,
      initialPoints: slot.points.map((p) => ({ ...p }))
    })
  }

  // Delete a slot
  const handleDeleteSlot = (slotId) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    if (selectedSlotId === slotId) {
      setSelectedSlotId(null)
    }
    showToast(`ลบช่อง ${slotId} แล้ว`)
  }

  // Duplicate a slot
  const handleDuplicateSlot = (slot) => {
    const newId = getNextSlotId(slot.type)
    const offset = 40
    const newPoints = slot.points.map((p) => ({
      x: Math.min(NATIVE_WIDTH - 20, p.x + offset),
      y: Math.min(NATIVE_HEIGHT - 20, p.y + offset)
    }))
    const xs = newPoints.map((p) => p.x)
    const ys = newPoints.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const duplicated = {
      ...slot,
      id: newId,
      occupied: false,
      vehicle_name: 'ว่างพร้อมจอด',
      points: newPoints,
      bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }

    setSlots((prev) => [...prev, duplicated])
    setSelectedSlotId(newId)
    showToast(`คัดลอกช่อง ${slot.id} เป็น ${newId} สำเร็จ`)
  }

  // Update a field in a slot
  const handleUpdateSlotField = (slotId, field, value) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s
        return { ...s, [field]: value }
      })
    )
  }

  // Reset slots to defaults for active camera
  const handleResetDefaults = () => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการคืนค่าช่องจอดเริ่มต้นของ ${activeCam.code}?`)) {
      const def = resetCameraSlots(selectedCamId)
      setSlots(def)
      setSelectedSlotId(null)
      setPolygonDraft([])
      showToast(`คืนค่าช่องจอดเริ่มต้นของ ${activeCam.code} (${def.length} ช่อง) เรียบร้อย`)
    }
  }

  // Clear all slots for active camera
  const handleClearAll = () => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบช่องจอดทั้งหมดของ ${activeCam.code}?`)) {
      setSlots([])
      setSelectedSlotId(null)
      setPolygonDraft([])
      saveSlotsToStorage([], selectedCamId)
      showToast(`ล้างช่องจอดทั้งหมดของ ${activeCam.code} เรียบร้อย`)
    }
  }

  // Export JSON Download
  const handleDownloadJson = () => {
    const dataToExport = {
      camera_id: selectedCamId,
      camera_name: activeCam.name,
      location: activeCam.location,
      exported_at: new Date().toISOString(),
      capacity: slots.length,
      zones: zones,
      polygon: zones.length > 0 ? zones[0].points.map((p) => [p.x, p.y]) : [],
      slots: slots
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `roi_${selectedCamId}_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    showToast(`ส่งออกไฟล์ JSON ของ ${activeCam.code} สำเร็จ!`)
    setShowExportModal(false)
  }

  // Import JSON Paste
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText)
      const slotList = Array.isArray(parsed) ? parsed : parsed.slots || []
      if (!Array.isArray(slotList) || slotList.length === 0) {
        alert('ไม่พบรายการช่องจอด (slots) ที่ถูกต้องใน JSON')
        return
      }

      const formatted = slotList.map((item, idx) => ({
        id: item.id || `S${(idx + 1).toString().padStart(2, '0')}`,
        type: item.type === 'motorcycle' || item.type === 'bike' ? 'motorcycle' : 'car',
        shape: item.shape || 'polygon',
        occupied: !!item.occupied,
        vehicle_name: item.vehicle_name || 'ว่างพร้อมจอด',
        points: item.points || [
          { x: item.bbox?.x || 100, y: item.bbox?.y || 100 },
          { x: (item.bbox?.x || 100) + (item.bbox?.width || 150), y: item.bbox?.y || 100 },
          { x: (item.bbox?.x || 100) + (item.bbox?.width || 150), y: (item.bbox?.y || 100) + (item.bbox?.height || 100) },
          { x: item.bbox?.x || 100, y: (item.bbox?.y || 100) + (item.bbox?.height || 100) }
        ],
        bbox: item.bbox || {
          x: 100,
          y: 100,
          width: 150,
          height: 100
        }
      }))

      setSlots(formatted)
      saveSlotsToStorage(formatted, selectedCamId)

      if (parsed.zones && Array.isArray(parsed.zones)) {
        const norm = normalizeZones(parsed.zones)
        if (norm.length > 0) {
          setZones(norm)
          saveZonesToStorage(norm, selectedCamId)
          setSelectedZoneId(norm[0].id)
        }
      } else if (parsed.polygon && Array.isArray(parsed.polygon) && parsed.polygon.length >= 3) {
        const norm = normalizeZones(parsed.polygon)
        if (norm.length > 0) {
          setZones(norm)
          saveZonesToStorage(norm, selectedCamId)
          setSelectedZoneId(norm[0].id)
        }
      }

      setShowImportModal(false)
      setImportJsonText('')
      showToast(`นำเข้าสำเร็จ ${formatted.length} ช่องจอดสำหรับ ${activeCam.code}`)
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอ่าน JSON: ' + err.message)
    }
  }

  const selectedSlot = slots.find((s) => s.id === selectedSlotId)

  return (
    <div className={`parking-setup-page ${embedded ? 'embedded-mode' : ''}`}>
      {/* Top Banner / Breadcrumb */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3">
          <div className="setup-icon-box">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                ตั้งค่าพิกัดลานจอดรถ (Parking ROI Setup)
              </h2>
              <span className="badge-chip badge-chip-live">
                <span>{activeCam.code}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              กำหนดขอบเขตโซนลานจอดและช่องจอดรายคัน • {activeCam.name}
            </p>
          </div>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex items-center gap-2">
          {onNavigate && !embedded && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="btn-setup-back"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>กลับสู่ Dashboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="btn-setup-back"
            title="ส่งออกพิกัดเป็น JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleSaveRoiToServer}
            disabled={isSyncingServer}
            className="btn-setup-export"
            title={`บันทึกพิกัด ROI & โซนของกล้อง ${activeCam.code} ไปยัง PostgreSQL`}
          >
            <Save className={`w-4 h-4 ${isSyncingServer ? 'animate-spin' : ''}`} />
            <span>{isSyncingServer ? 'กำลังบันทึก...' : `บันทึก ROI (${activeCam.code})`}</span>
          </button>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="alert-setup-saved animate-bounce-short">
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Info className="w-4 h-4 text-blue-400" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Camera Selection Switcher Bar */}
      <div className="camera-switcher-card">
        <div className="camera-switcher-header">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              เลือกจุดติดตั้งกล้อง ({SYSTEM_CAMERAS.length} โหนด):
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            คลิกเลือกกล้องเพื่อวาดโซนและกำหนดช่องจอด
          </span>
        </div>

        <div className="camera-switcher-tabs-grid">
          {SYSTEM_CAMERAS.map((cam) => {
            const isSelected = cam.id === selectedCamId
            const camSlots = isSelected ? slots : getSavedOrInitialSlots(cam.id)
            const counts = calculateSlotCounts(camSlots)
            const hasCustomImage = !!getCameraImage(cam.id)

            return (
              <button
                key={cam.id}
                type="button"
                className={`camera-switcher-btn ${isSelected ? 'active' : ''}`}
                onClick={() => handleSwitchCamera(cam.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="cam-switcher-code">{cam.code}</span>
                  <div className="flex items-center gap-1.5">
                    {hasCustomImage ? (
                      <span className="cam-tab-custom-badge" title="มีภาพอัปโหลดเฉพาะ">
                        CUSTOM
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        LIVE
                      </span>
                    )}
                    <span className="cam-switcher-zone">{cam.zoneName}</span>
                  </div>
                </div>

                <div className="cam-switcher-name text-left">{cam.name}</div>
                <div className="text-[10px] text-slate-400 text-left font-mono">{cam.device}</div>

                <div className="cam-switcher-stats mt-1">
                  <span className="stat-pill car">
                    รถยนต์: <strong>{counts.car.total}</strong> ({counts.car.free} ว่าง)
                  </span>
                  <span className="stat-pill bike">
                    มอเตอร์ไซค์: <strong>{counts.bike.total}</strong> ({counts.bike.free} ว่าง)
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step-by-Step Guided Navigation Flow Bar */}
      <div className="roi-step-flow-bar">
        <button
          type="button"
          className={`roi-step-card-tab ${setupStep === 1 ? 'active' : ''} ${zones.length > 0 ? 'completed' : ''}`}
          onClick={() => {
            setSetupStep(1)
            setSelectedSlotId(null)
          }}
        >
          <div className="step-num-bubble">
            {zones.length > 0 ? '✓' : '1'}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>ขั้นตอนที่ 1: กำหนดโซนพื้นที่จอดรวม (Multi-Zone Masks)</span>
              {zones.length > 0 && (
                <span className="text-[10px] bg-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {zones.length} โซน
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {zones.length > 0
                ? `วาดแล้ว ${zones.length} โซน (รถยนต์: ${zones.filter((z) => z.type === 'car').length} • มอเตอร์ไซค์: ${zones.filter((z) => z.type === 'motorcycle' || z.type === 'bike').length})`
                : 'คลิก 4 มุมเพื่อกำหนดขอบเขตโซนรถยนต์ / มอเตอร์ไซค์'}
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`roi-step-card-tab step-2 ${setupStep === 2 ? 'active' : ''}`}
          onClick={() => {
            setSetupStep(2)
            setZoneDraft([])
          }}
        >
          <div className="step-num-bubble">2</div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>ขั้นตอนที่ 2: วาดช่องจอดรถรายคัน (Parking Slots)</span>
              {slots.length > 0 && (
                <span className="text-[10px] bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {slots.length} ช่อง
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {slots.length > 0
                ? `รถยนต์ ${slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike').length} ช่อง • มอเตอร์ไซค์ ${slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length} ช่อง`
                : 'วาดช่องจอดรถยนต์ / มอเตอร์ไซค์ ทีละคันภายในแต่ละโซน'}
            </div>
          </div>
        </button>
      </div>

      {/* Main Work Area: Canvas on Left, Controls & List on Right */}
      <div className="setup-workspace-grid">
        {/* Left Column: Canvas Viewport & Toolbar */}
        <div className="setup-canvas-panel">
          {/* Top Canvas Toolbar */}
          <div className="canvas-toolbar">
            {/* ================================================== */}
            {/* TOOLBAR FOR STEP 1: MULTI-ZONE AREA MASKS */}
            {/* ================================================== */}
            {setupStep === 1 ? (
              <div className="toolbar-group flex-wrap gap-2">
                <span className="toolbar-label text-indigo-300 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>ประเภทโซน:</span>
                </span>

                {/* Zone Type Toggle (Car vs Motorcycle) */}
                <div className="toolbar-segmented-group">
                  <button
                    type="button"
                    className={`toolbar-segment-btn ${zoneDrawType === 'car' ? 'active car-zone' : ''}`}
                    onClick={() => setZoneDrawType('car')}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>โซนรถยนต์ (Car)</span>
                  </button>

                  <button
                    type="button"
                    className={`toolbar-segment-btn ${zoneDrawType === 'motorcycle' ? 'active bike-zone' : ''}`}
                    onClick={() => setZoneDrawType('motorcycle')}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>โซนมอเตอร์ไซค์ (Bike)</span>
                  </button>
                </div>

                {zoneDraft.length === 0 ? (
                  <div className={`toolbar-instruction-pill ${zoneDrawType === 'motorcycle' ? 'bike' : ''}`}>
                    <Pentagon className="w-3.5 h-3.5 opacity-70" />
                    <span>คลิก 4 มุมบนภาพเพื่อวาด{zoneDrawType === 'motorcycle' ? 'โซนมอเตอร์ไซค์' : 'โซนรถยนต์'}</span>
                  </div>
                ) : (
                  <>
                    <div className="toolbar-instruction-pill drafting">
                      <span>กำลังวาด{zoneDrawType === 'motorcycle' ? 'โซนมอเตอร์ไซค์' : 'โซนรถยนต์'}: จุดที่ {zoneDraft.length}/4</span>
                    </div>

                    {zoneDraft.length >= 3 && (
                      <button
                        type="button"
                        className="tool-btn highlight"
                        onClick={handleFinishZoneDraft}
                        title="เสร็จสิ้นและบันทึกโซนนี้"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>เสร็จสิ้น ({zoneDraft.length} จุด)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="tool-btn danger"
                      onClick={handleCancelZoneDraft}
                      title="ยกเลิกการวาดโซนนี้"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ยกเลิก</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* ================================================== */
              /* TOOLBAR FOR STEP 2: INDIVIDUAL SLOTS */
              /* ================================================== */
              <div className="toolbar-group flex-wrap gap-2">
                <button
                  type="button"
                  className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentTool('select')
                    setPolygonDraft([])
                  }}
                  title="เลือกและขยับจุดพิกัดช่องจอด"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>เลือก / ขยับจุด</span>
                </button>

                {/* Drawing Vehicle Mode */}
                <div className="toolbar-segmented-group">
                  <button
                    type="button"
                    className={`toolbar-segment-btn ${currentTool !== 'select' && drawType === 'car' ? 'active car-slot' : ''}`}
                    onClick={() => {
                      setDrawType('car')
                      setNextSlotPrefix(activeCam.defaultCarPrefix)
                      if (currentTool === 'select') setCurrentTool('polygon')
                    }}
                    title={`วาดช่องจอดรถยนต์ (${activeCam.defaultCarPrefix}..)`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>วาดรถยนต์ ({activeCam.defaultCarPrefix}..)</span>
                  </button>

                  <button
                    type="button"
                    className={`toolbar-segment-btn ${currentTool !== 'select' && drawType === 'motorcycle' ? 'active bike-slot' : ''}`}
                    onClick={() => {
                      setDrawType('motorcycle')
                      setNextSlotPrefix(activeCam.defaultBikePrefix)
                      if (currentTool === 'select') setCurrentTool('polygon')
                    }}
                    title={`วาดช่องจอดมอเตอร์ไซค์ (${activeCam.defaultBikePrefix}..)`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>วาดมอเตอร์ไซค์ ({activeCam.defaultBikePrefix}..)</span>
                  </button>
                </div>

                {/* Tool Shape Toggle */}
                <div className="toolbar-segmented-group">
                  <button
                    type="button"
                    className={`toolbar-segment-btn ${currentTool === 'polygon' ? 'active tool' : ''}`}
                    onClick={() => setCurrentTool('polygon')}
                    title="คลิก 4 มุมช่องจอด (Polygon)"
                  >
                    <Pentagon className="w-3.5 h-3.5 text-amber-400" />
                    <span>4 จุด</span>
                  </button>

                  <button
                    type="button"
                    className={`toolbar-segment-btn ${currentTool === 'bbox' ? 'active tool' : ''}`}
                    onClick={() => setCurrentTool('bbox')}
                    title="คลิกลากสี่เหลี่ยม (Bounding Box)"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>กล่อง</span>
                  </button>
                </div>

                {polygonDraft.length > 0 && (
                  <button
                    type="button"
                    className="tool-btn danger"
                    onClick={handleCancelPolygon}
                    title="ยกเลิกจุดที่กำลังคลิก"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>ยกเลิก ({polygonDraft.length}/4)</span>
                  </button>
                )}
              </div>
            )}

            {/* Right Group: Live Camera Actions & Display Toggles */}
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
                  setSelectedFrameIndex(-1)
                  setLiveSnapshotKey(Date.now())
                  fetchCameraLive(selectedCamId)
                  showToast(`ดึงภาพสดล่าสุดจากกล้อง ${activeCam.code} เรียบร้อย!`)
                }}
                title={`ดึงภาพ Snapshot สดล่าสุดจากกล้อง ${activeCam.code}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>ดึงภาพสด</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={() => fileInputRef.current?.click()}
                title={`อัปโหลดภาพสำหรับกล้อง ${activeCam.code}`}
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
                title="เปิด/ปิด การแสดงกรอบโซนพื้นที่จอดรวม"
              >
                <Layers className={`w-3.5 h-3.5 ${showZoneOverlay ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>Zone Mask</span>
              </button>

              <button
                type="button"
                className={`icon-toggle-btn ${showLabels ? 'active' : ''}`}
                onClick={() => setShowLabels(!showLabels)}
                title="เปิด/ปิด ป้ายชื่อรหัสช่องจอด"
              >
                {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>Labels</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div
            className={`roi-viewport-wrapper ${setupStep === 1 ? 'polygon' : currentTool}`}
            ref={containerRef}
          >
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
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onClick={handleSvgClick}
            >

              {/* 1. Render Confirmed Zone Area Polygons (Multi-Zone Support) */}
              {showZoneOverlay &&
                zones.map((zone, zIdx) => {
                  const isZoneSelected = setupStep === 1 && zone.id === selectedZoneId
                  const isBikeZone = zone.type === 'motorcycle' || zone.type === 'bike'
                  const ptsStr = zone.points.map((p) => `${p.x},${p.y}`).join(' ')
                  const minX = Math.min(...zone.points.map((p) => p.x))
                  const minY = Math.min(...zone.points.map((p) => p.y))
                  const zoneArea = calculatePolygonArea(zone.points)

                  return (
                    <g key={zone.id || zIdx} className="zone-polygon-group">
                      <polygon
                        points={ptsStr}
                        className={`zone-area-polygon ${isBikeZone ? 'bike-zone' : 'car-zone'} ${
                          isZoneSelected ? 'active' : ''
                        }`}
                        pointerEvents={setupStep === 1 ? 'auto' : 'none'}
                        onMouseDown={
                          setupStep === 1 ? (e) => handleZoneShapeMouseDown(e, zone) : undefined
                        }
                        onClick={
                          setupStep === 1
                            ? (e) => {
                                e.stopPropagation()
                                setSelectedZoneId(zone.id)
                              }
                            : undefined
                        }
                      />

                      {/* Zone Label Badge */}
                      {showLabels && (
                        <g className="zone-label-group" pointerEvents="none">
                          <rect
                            x={minX + 12}
                            y={minY + 12}
                            width={310}
                            height={32}
                            rx={6}
                            className={`zone-label-bg ${isBikeZone ? 'bike-badge' : ''}`}
                          />
                          <text
                            x={minX + 167}
                            y={minY + 33}
                            textAnchor="middle"
                            className={`zone-label-text ${isBikeZone ? 'bike-text' : ''}`}
                          >
                            {zone.name || `ZONE ${zIdx + 1}`} ({zoneArea.toLocaleString()} px²)
                          </text>
                        </g>
                      )}

                      {/* Zone Vertex Drag Handles in Step 1 (for selected zone) */}
                      {setupStep === 1 &&
                        isZoneSelected &&
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

              {/* Active Zone Draft in Progress (Step 1) */}
              {setupStep === 1 && zoneDraft.length > 0 && (
                <g className="zone-draft-group" pointerEvents="none">
                  {zoneDraft.map((pt, idx) => {
                    const nextPt = zoneDraft[idx + 1] || cursorPos
                    return (
                      <line
                        key={idx}
                        x1={pt.x}
                        y1={pt.y}
                        x2={nextPt.x}
                        y2={nextPt.y}
                        className={`zone-draft-line ${zoneDrawType === 'motorcycle' ? 'bike-draft' : ''}`}
                      />
                    )
                  })}
                  {zoneDraft.map((pt, idx) => (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={9}
                        className={
                          zoneDrawType === 'motorcycle'
                            ? 'fill-cyan-500 stroke-white stroke-2'
                            : 'fill-indigo-500 stroke-white stroke-2'
                        }
                      />
                      <text
                        x={pt.x + 12}
                        y={pt.y - 8}
                        className={`text-xs font-bold font-mono ${
                          zoneDrawType === 'motorcycle' ? 'fill-cyan-300' : 'fill-indigo-300'
                        }`}
                      >
                        P{idx + 1}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* 2. Render All Confirmed Individual Parking Slots (Step 2) */}
              {slots.map((slot) => {
                const isSelected = slot.id === selectedSlotId
                const pointsString = slot.points.map((p) => `${p.x},${p.y}`).join(' ')
                const centerPoint = {
                  x: slot.points.reduce((acc, p) => acc + p.x, 0) / slot.points.length,
                  y: slot.points.reduce((acc, p) => acc + p.y, 0) / slot.points.length
                }
                const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                const isOccupied = !!slot.occupied

                return (
                  <g key={slot.id} className={`slot-group ${isSelected ? 'selected' : ''}`}>
                    {/* Polygon ROI Body */}
                    <polygon
                      points={pointsString}
                      className={`slot-polygon ${isSelected ? 'active-polygon' : ''} ${
                        isBike ? 'bike-polygon' : 'car-polygon'
                      } ${isOccupied ? 'occupied' : 'vacant'}`}
                      pointerEvents={setupStep === 2 && currentTool === 'select' ? 'auto' : 'none'}
                      onMouseDown={(e) => {
                        if (setupStep === 2 && currentTool === 'select') handleShapeMouseDown(e, slot)
                      }}
                      onClick={(e) => {
                        if (setupStep === 2 && currentTool === 'select') {
                          e.stopPropagation()
                          setSelectedSlotId(slot.id)
                        }
                      }}
                    />

                    {/* Corner Vertex Handles (when selected in Step 2) */}
                    {setupStep === 2 &&
                      isSelected &&
                      slot.points.map((pt, pIdx) => (
                        <circle
                          key={pIdx}
                          cx={pt.x}
                          cy={pt.y}
                          r={10}
                          className={`slot-handle-vertex ${isBike ? 'bike-vertex' : 'car-vertex'}`}
                          onMouseDown={(e) => handlePointMouseDown(e, slot.id, pIdx)}
                        />
                      ))}

                    {/* Center Slot Label */}
                    {showLabels && (
                      <g className="slot-label-group" pointerEvents="none">
                        <rect
                          x={centerPoint.x - 38}
                          y={centerPoint.y - 14}
                          width={76}
                          height={28}
                          rx={6}
                          className={`slot-label-bg ${isSelected ? 'active-label' : ''} ${
                            isBike ? 'bike-label' : 'car-label'
                          } ${isOccupied ? 'occupied' : 'vacant'}`}
                        />
                        <text
                          x={centerPoint.x}
                          y={centerPoint.y + 5}
                          textAnchor="middle"
                          className="slot-label-text"
                        >
                          {slot.id}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Active 4-Pt Polygon Draft in Progress (Step 2) */}
              {setupStep === 2 && polygonDraft.length > 0 && (
                <g className="polygon-draft-group" pointerEvents="none">
                  {/* Lines between confirmed draft points */}
                  {polygonDraft.map((pt, idx) => {
                    const nextPt = polygonDraft[idx + 1] || cursorPos
                    return (
                      <line
                        key={idx}
                        x1={pt.x}
                        y1={pt.y}
                        x2={nextPt.x}
                        y2={nextPt.y}
                        className={`polygon-draft-line ${drawType === 'motorcycle' ? 'bike-draft' : 'car-draft'}`}
                      />
                    )
                  })}

                  {/* Vertices of draft */}
                  {polygonDraft.map((pt, idx) => (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={9}
                        className={`draft-point-circle ${drawType === 'motorcycle' ? 'bike-point' : 'car-point'}`}
                      />
                      <text x={pt.x + 12} y={pt.y - 8} className="draft-point-label">
                        จุดที่ {idx + 1}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* Active BBox Drag Preview (Step 2) */}
              {setupStep === 2 && currentTool === 'bbox' && bboxDragStart && bboxDragCurrent && (
                <rect
                  x={Math.min(bboxDragStart.x, bboxDragCurrent.x)}
                  y={Math.min(bboxDragStart.y, bboxDragCurrent.y)}
                  width={Math.abs(bboxDragCurrent.x - bboxDragStart.x)}
                  height={Math.abs(bboxDragCurrent.y - bboxDragStart.y)}
                  className={`bbox-drag-preview ${drawType === 'motorcycle' ? 'bike-bbox' : 'car-bbox'}`}
                  pointerEvents="none"
                />
              )}
            </svg>

            {/* Bottom Meta Status Bar inside Canvas */}
            <div className="viewport-status-footer">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge-tag">
                  {activeCam.code} • {activeCam.name}
                </span>
                <span className="text-slate-400">
                  ไฟล์: <code className="text-cyan-400">{currentRecord.filename}</code>
                </span>
                <span className="text-slate-400">
                  เวลา: <span className="text-emerald-400">{currentRecord.local_time}</span>
                </span>
                <span className="text-slate-400">
                  IP: <span className="text-slate-300 font-mono">{currentRecord.client_ip}</span>
                </span>
                <span className="text-slate-400">
                  Temp: <span className="text-amber-400 font-mono">{currentRecord.chip_temp}°C</span>
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
                {setupStep === 1 ? (
                  <>
                    <strong>คำแนะนำขั้นตอนที่ 1:</strong> คลิก 4 มุมบนภาพเพื่อตีกรอบลานจอดรถรวมให้ครอบคลุมพื้นที่ทั้งหมด จากนั้นลากจุดมุม P1-P4 เพื่อปรับความโค้งเอียงให้พอดี แล้วกด <strong>"ถัดไป: วาดช่องจอดรถ (Step 2)"</strong>
                  </>
                ) : (
                  <>
                    <strong>คำแนะนำขั้นตอนที่ 2:</strong> เลือก <strong>"วาดรถยนต์"</strong> หรือ <strong>"วาดมอเตอร์ไซค์"</strong> แล้วคลิก 4 มุมเพื่อสร้างช่องจอดทีละคันภายในโซนที่กำหนดไว้
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Slot Management & Inspector Pane */}
        <div className="setup-inspector-panel">
          {/* ================================================== */}
          {/* STEP 1 INSPECTOR PANE */}
          {/* ================================================== */}
          {setupStep === 1 ? (
            <>
              <div className="inspector-card zone-card">
                <div className="inspector-card-header">
                  <div className="inspector-title">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Multi-Zone Masks • {activeCam.code} ({zones.length})</span>
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

                {/* Purpose Description */}
                <div className="inspector-desc-box">
                  กำหนดขอบเขตพื้นที่โซนเพื่อคำนวณ <strong>Pixel Occupancy (%)</strong> แยกตามประเภทรถยนต์และมอเตอร์ไซค์
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
                            <div className="zone-item-title-group">
                              {isBike ? (
                                <Bike className="w-4 h-4 text-cyan-400 shrink-0" />
                              ) : (
                                <Car className="w-4 h-4 text-indigo-400 shrink-0" />
                              )}
                              <span className="zone-item-name font-mono">
                                {zone.name || `โซนที่ ${zIdx + 1}`}
                              </span>
                              <span className={`zone-type-badge ${isBike ? 'bike' : 'car'}`}>
                                {isBike ? 'มอเตอร์ไซค์' : 'รถยนต์'}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="btn-icon-tiny danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteZone(zone.id)
                              }}
                              title="ลบโซนนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>

                          {/* Zone Metrics */}
                          <div className="zone-metrics-grid">
                            <div className="zone-metric-tile">
                              <span className="zone-metric-label">ขนาดพื้นที่</span>
                              <span className={`zone-metric-val ${isBike ? 'text-cyan-300' : 'text-indigo-300'}`}>
                                {areaPx.toLocaleString()} px²
                              </span>
                            </div>
                            <div className="zone-metric-tile">
                              <span className="zone-metric-label">สัดส่วนภาพ</span>
                              <span className="zone-metric-val highlight">
                                {areaPct}%
                              </span>
                            </div>
                          </div>

                          {/* Coordinate points (shown when selected) */}
                          {isSelected && (
                            <div className="zone-points-section">
                              <div className="zone-points-header">
                                <span className="zone-points-title">
                                  จุดมุม ({zone.points.length} จุด):
                                </span>
                                <span className="zone-points-hint">*ลากปรับจุดบนภาพได้</span>
                              </div>
                              <div className="zone-points-grid">
                                {zone.points.map((pt, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className={`zone-point-pill ${isBike ? 'bike' : 'car'}`}
                                  >
                                    <span className="pt-id">P{pIdx + 1}:</span>
                                    <span className="pt-coords">({pt.x}, {pt.y})</span>
                                    {zone.points.length > 3 && (
                                      <button
                                        type="button"
                                        className="btn-del-pt"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteZonePoint(zone.id, pIdx)
                                        }}
                                        title="ลบจุดนี้"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Step 1 Next Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        className="btn-step-confirm"
                        onClick={() => {
                          saveZonesToStorage(zones, selectedCamId)
                          saveRoiToServer(selectedCamId, slots, zones)
                          setSetupStep(2)
                          showToast(`บันทึก ${zones.length} โซนของ ${activeCam.code} เรียบร้อย! เข้าสู่ขั้นตอนที่ 2`)
                        }}
                      >
                        <span>ยืนยันโซน ({zones.length} โซน) และไปยังขั้นตอนที่ 2</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Layers className="w-10 h-10 text-indigo-400/50 mx-auto mb-2 animate-pulse" />
                    <h4 className="text-sm font-bold text-indigo-200 mb-1">ยังไม่ได้กำหนดโซนพื้นที่จอด</h4>
                    <p className="text-xs text-slate-400 leading-relaxed px-2">
                      เลือก <strong>"วาดโซนรถยนต์"</strong> หรือ <strong>"วาดโซนมอเตอร์ไซค์"</strong> จากแถบเครื่องมือด้านบน แล้วคลิก 4 จุดบนภาพเพื่อกำหนดขอบเขตพื้นที่ สามารถสร้างได้หลายโซน
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ================================================== */
            /* STEP 2 INSPECTOR PANE */
            /* ================================================== */
            <>
              {/* Summary KPIs */}
              <div className="inspector-card">
                <div className="slot-summary-header">
                  <div className="inspector-title">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Slot Registry • {activeCam.code} ({slots.length})</span>
                  </div>
                  <div className="slot-count-badges">
                    <span className="mini-badge car">
                      <Car className="w-3 h-3 text-emerald-400" />
                      <span>รถยนต์: {slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike').length}</span>
                    </span>
                    <span className="mini-badge bike">
                      <Bike className="w-3 h-3 text-cyan-400" />
                      <span>มอเตอร์ไซค์: {slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length}</span>
                    </span>
                  </div>
                </div>

                {/* KPI Metrics Grid */}
                <div className="zone-metrics-grid">
                  <div className="zone-metric-tile">
                    <span className="zone-metric-label">สัดส่วนช่องจอด</span>
                    <span className="zone-metric-val">
                      <span className="text-emerald-400">{slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike').length} รถ</span>
                      {' • '}
                      <span className="text-cyan-400">{slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length} มอเตอร์ไซค์</span>
                    </span>
                  </div>
                  <div className="zone-metric-tile">
                    <span className="zone-metric-label">รหัสเริ่มต้นถัดไป ({drawType === 'motorcycle' ? 'มอไซค์' : 'รถยนต์'})</span>
                    <span className="zone-metric-val highlight font-mono">
                      {getNextSlotId()}
                    </span>
                  </div>
                </div>

                {/* If no motorcycle slots yet, show quick helper button */}
                {slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length === 0 && (
                  <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <Bike className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ยังไม่มีช่องมอเตอร์ไซค์ ({activeCam.code})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDefaultBikes}
                      className="btn-seed-bikes"
                    >
                      + เพิ่มช่องมอเตอร์ไซค์ทันที
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Slot Detailed Inspector */}
              {selectedSlot ? (
                <div className="inspector-card active-slot-card">
                  <div className="inspector-card-header">
                    <div className="inspector-title">
                      <span className="font-mono text-base font-bold text-emerald-400">
                        {selectedSlot.id}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({selectedSlot.shape === 'bbox' ? 'Bounding Box' : '4-Point Polygon'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="btn-icon-tiny"
                        onClick={() => handleDuplicateSlot(selectedSlot)}
                        title="คัดลอกช่องนี้"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-tiny danger"
                        onClick={() => handleDeleteSlot(selectedSlot.id)}
                        title="ลบช่องนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Slot ID */}
                  <div className="inspector-field">
                    <label>รหัสช่องจอด (Slot ID):</label>
                    <input
                      type="text"
                      className="inspector-text-input font-mono"
                      value={selectedSlot.id}
                      onChange={(e) => handleUpdateSlotField(selectedSlot.id, 'id', e.target.value)}
                    />
                  </div>

                  {/* Edit Vehicle Type */}
                  <div className="inspector-field">
                    <label>ประเภทยานพาหนะ:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`type-select-btn ${selectedSlot.type === 'car' ? 'active car-active' : ''}`}
                        onClick={() => handleUpdateSlotField(selectedSlot.id, 'type', 'car')}
                      >
                        <Car className="w-3.5 h-3.5 text-emerald-400" />
                        <span>รถยนต์ (Car)</span>
                      </button>
                      <button
                        type="button"
                        className={`type-select-btn ${selectedSlot.type === 'motorcycle' ? 'active bike-active' : ''}`}
                        onClick={() => handleUpdateSlotField(selectedSlot.id, 'type', 'motorcycle')}
                      >
                        <Bike className="w-3.5 h-3.5 text-cyan-400" />
                        <span>มอเตอร์ไซค์ (Bike)</span>
                      </button>
                    </div>
                  </div>

                  {/* Edit Occupancy Status (สถานะจำลอง / Test Override) */}
                  <div className="inspector-field">
                    <div className="flex items-center justify-between mb-1">
                      <label style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600 }}>สถานะจำลอง (Simulation):</label>
                      <span className="text-[10px] text-slate-500">
                        *ตรวจจับจริงด้วย AI YOLO
                      </span>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        className={`occupancy-toggle-btn ${!selectedSlot.occupied ? 'vacant' : ''}`}
                        onClick={() => handleUpdateSlotField(selectedSlot.id, 'occupied', false)}
                        title="ทดสอบจำลองเป็นช่องว่าง"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ว่างพร้อมจอด (Vacant)</span>
                      </button>
                      <button
                        type="button"
                        className={`occupancy-toggle-btn ${selectedSlot.occupied ? 'occupied' : ''}`}
                        onClick={() => handleUpdateSlotField(selectedSlot.id, 'occupied', true)}
                        title="ทดสอบจำลองเป็นมีรถจอด"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400" />
                        <span>มีรถจอด (Occupied)</span>
                      </button>
                    </div>

                    {selectedSlot.occupied && (
                      <input
                        type="text"
                        className="inspector-text-input text-xs"
                        placeholder="ระบุชื่อรุ่น/ทะเบียน (เช่น Sedan ดำ ฮฮ-9988)"
                        value={selectedSlot.vehicle_name || ''}
                        onChange={(e) => handleUpdateSlotField(selectedSlot.id, 'vehicle_name', e.target.value)}
                      />
                    )}
                  </div>

                  {/* Coordinate Points Readout */}
                  <div className="inspector-field">
                    <label>พิกัดจุดมุม (Coordinates X, Y):</label>
                    <div className="coords-grid">
                      {selectedSlot.points.map((pt, idx) => (
                        <div key={idx} className="coord-chip">
                          <span className="coord-idx">P{idx + 1}:</span>
                          <span className="font-mono">({pt.x}, {pt.y})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bounding Box Summary */}
                  <div className="inspector-field" style={{ marginBottom: 0 }}>
                    <label>ขนาด Bounding Box:</label>
                    <div className="text-xs font-mono text-slate-300 bg-black/40 p-2 rounded border border-white/5 flex justify-between">
                      <span>X: {selectedSlot.bbox.x} Y: {selectedSlot.bbox.y}</span>
                      <span>W: {selectedSlot.bbox.width}px H: {selectedSlot.bbox.height}px</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="inspector-card text-center py-5">
                  <MousePointer className="w-7 h-7 text-slate-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-200 mb-1">เลือกช่องจอดเพื่อแก้ไข</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed px-3">
                    คลิกเลือกช่องจอดบนภาพ หรือในรายการด้านล่างเพื่อแก้ไขพิกัดและรหัสช่อง
                  </p>
                </div>
              )}

              {/* Slot List Scroll Area */}
              <div className="inspector-card flex-1 min-h-0 flex flex-col">
                <div className="inspector-card-header">
                  <div className="inspector-title">
                    <span>รายการช่องจอดทั้งหมด ({slots.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    คลิกแถวเพื่อดูรายละเอียด
                  </span>
                </div>

                <div className="slots-list-scrollable">
                  {slots.map((slot) => {
                    const isBike = slot.type === 'motorcycle' || slot.type === 'bike'
                    const isOccupied = !!slot.occupied
                    return (
                      <div
                        key={slot.id}
                        className={`slot-item-row ${slot.id === selectedSlotId ? 'active' : ''}`}
                        onClick={() => setSelectedSlotId(slot.id)}
                      >
                        <div className="slot-row-meta">
                          <span className={`slot-badge-id ${isBike ? 'bike' : ''}`}>
                            {slot.id}
                          </span>
                          <span className={`slot-type-chip ${isBike ? 'bike' : 'car'}`}>
                            {isBike ? (
                              <>
                                <Bike className="w-3 h-3 text-cyan-400" />
                                <span>มอไซค์</span>
                              </>
                            ) : (
                              <>
                                <Car className="w-3 h-3 text-emerald-400" />
                                <span>รถยนต์</span>
                              </>
                            )}
                          </span>
                          <span className={`slot-status-chip ${isOccupied ? 'occupied' : 'vacant'}`}>
                            {isOccupied ? 'มีรถ' : 'ว่าง'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            {slot.points.length} pts
                          </span>
                          <button
                            type="button"
                            className="btn-icon-tiny"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicateSlot(slot)
                            }}
                            title="คัดลอก"
                          >
                            <Copy className="w-3 h-3 text-blue-400" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon-tiny danger"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSlot(slot.id)
                            }}
                            title="ลบ"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Export JSON Modal */}
      {showExportModal && (
        <div className="roi-modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div className="roi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="roi-modal-header">
              <h3 className="text-base font-bold text-white">Export ROI Coordinates (JSON)</h3>
              <button
                type="button"
                className="btn-icon-action"
                onClick={() => setShowExportModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              ดาวน์โหลดพิกัดช่องจอดทั้งหมด ({slots.length} ช่อง) ของกล้อง <strong>{activeCam.code}</strong> สำหรับนำไปใช้กับโมเดลตรวจจับ
            </p>
            <textarea
              readOnly
              className="roi-json-preview font-mono text-xs"
              value={JSON.stringify(
                {
                  camera_id: selectedCamId,
                  name: activeCam.name,
                  location: activeCam.location,
                  capacity: slots.length,
                  zones: zones,
                  polygon: zones.length > 0 ? zones[0].points.map((p) => [p.x, p.y]) : [],
                  slots: slots
                },
                null,
                2
              )}
            />
            <div className="roi-modal-footer">
              <button
                type="button"
                className="btn-setup-back"
                onClick={() => setShowExportModal(false)}
              >
                ปิด
              </button>
              <button
                type="button"
                className="btn-setup-export"
                onClick={handleDownloadJson}
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดไฟล์ .json</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="roi-modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="roi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="roi-modal-header">
              <h3 className="text-base font-bold text-white">Import ROI Coordinates (JSON)</h3>
              <button
                type="button"
                className="btn-icon-action"
                onClick={() => setShowImportModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              วาง JSON พิกัดช่องจอดที่บันทึกไว้สำหรับกล้อง <strong>{activeCam.code}</strong>
            </p>
            <textarea
              className="roi-json-preview font-mono text-xs"
              placeholder='วาง JSON ที่นี่ เช่น: { "slots": [...] } หรือ [...]'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
            />
            <div className="roi-modal-footer">
              <button
                type="button"
                className="btn-setup-back"
                onClick={() => setShowImportModal(false)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn-setup-export"
                onClick={handleImportJson}
              >
                <Upload className="w-4 h-4" />
                <span>นำเข้าพิกัด</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
