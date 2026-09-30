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
  Thermometer
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
  fetchRoiFromServer
} from '../utils/dumpData'

// Native image resolution of the camera snapshot (1600x1200)
const NATIVE_WIDTH = 1600
const NATIVE_HEIGHT = 1200

export default function ParkingSetup({ onNavigate, embedded = false, initialCameraId = 'cam1' }) {
  // Active Camera Selection State (cam1, cam2, cam3)
  const [selectedCamId, setSelectedCamId] = useState(() => {
    return initialCameraId || 'cam1'
  })
  const activeCam = getCameraConfig(selectedCamId)

  // Real live camera snapshots and metadata from Ingestion Server & MinIO
  const [liveSnapshotKey, setLiveSnapshotKey] = useState(() => Date.now())
  const [liveCameraMeta, setLiveCameraMeta] = useState(null)
  const [recentFrames, setRecentFrames] = useState([])
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(-1) // -1 = live real-time snapshot
  const [autoLivePolling, setAutoLivePolling] = useState(false)
  const [isSyncingServer, setIsSyncingServer] = useState(false)

  // Custom uploaded/configured snapshot image for current camera
  const [customCamImage, setCustomCamImage] = useState(() => getCameraImage(selectedCamId))

  // Drawing Tools: 'select', 'bbox' (drag rectangle), 'polygon' (4 points)
  const [currentTool, setCurrentTool] = useState('polygon')
  // Drawing Vehicle Type: 'car' or 'motorcycle'
  const [drawType, setDrawType] = useState('car')

  // Slots state - synchronized with shared localStorage for active camera
  const [slots, setSlots] = useState(() => getSavedOrInitialSlots(selectedCamId))

  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [nextSlotPrefix, setNextSlotPrefix] = useState(activeCam.defaultCarPrefix)

  // Active Polygon drawing state (for 4-point clicks)
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

  // Auto-save to localStorage & notify ecosystem listeners whenever slots change
  useEffect(() => {
    if (prevCamIdRef.current === selectedCamId) {
      saveSlotsToStorage(slots, selectedCamId)
    } else {
      prevCamIdRef.current = selectedCamId
    }
  }, [slots, selectedCamId])

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => {
      setNotification(null)
    }, 3500)
  }

  // Handle switching active camera
  const handleSwitchCamera = (newCamId) => {
    if (newCamId === selectedCamId) return
    // 1. Save current camera's slots before switching
    saveSlotsToStorage(slots, selectedCamId)

    // 2. Load target camera
    const nextCam = getCameraConfig(newCamId)
    setSelectedCamId(newCamId)
    prevCamIdRef.current = newCamId
    const loadedSlots = getSavedOrInitialSlots(newCamId)
    setSlots(loadedSlots)
    setCustomCamImage(getCameraImage(newCamId))
    setSelectedFrameIndex(-1)
    setLiveSnapshotKey(Date.now())

    // 3. Reset editor drawing & selection state
    setSelectedSlotId(null)
    setPolygonDraft([])
    setBboxDragStart(null)
    setBboxDragCurrent(null)
    setDragging(null)
    setNextSlotPrefix(drawType === 'motorcycle' ? nextCam.defaultBikePrefix : nextCam.defaultCarPrefix)
    showToast(`สลับไปยัง ${nextCam.code} (${nextCam.name}) เรียบร้อย`)
  }

  // Handle save ROI to server & AI detection worker
  const handleSaveRoiToServer = async () => {
    setIsSyncingServer(true)
    saveSlotsToStorage(slots, selectedCamId)
    const ok = await saveRoiToServer(selectedCamId, slots)
    setIsSyncingServer(false)
    if (ok) {
      showToast(`💾 บันทึกพิกัด ROI กล้อง ${activeCam.code} (${slots.length} ช่อง) ไปยัง Server & AI Worker สำเร็จ!`)
    } else {
      showToast(`บันทึกใน LocalStorage เรียบร้อย (Server ตอบกลับไม่สำเร็จ)`, 'info')
    }
  }

  // Handle image upload from user device (ESP32-CAM snapshot or phone photo)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      try {
        saveCameraImage(selectedCamId, dataUrl)
        setCustomCamImage(dataUrl)
        showToast(`อัปโหลดภาพเฉพาะของกล้อง ${activeCam.code} สำเร็จ!`)
      } catch (err) {
        showToast('ไฟล์ภาพมีขนาดใหญ่เกินไปสำหรับ LocalStorage แนะนำให้ใช้ภาพย่อขนาด', 'info')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Reset to default snapshot photo
  const handleResetImage = () => {
    saveCameraImage(selectedCamId, null)
    setCustomCamImage(null)
    setSelectedFrameIndex(-1)
    setLiveSnapshotKey(Date.now())
    showToast(`คืนค่าภาพสดแบบเรียลไทม์ของ ${activeCam.code} แล้ว`)
  }

  // Quick helper to seed default motorcycle slots for the current camera
  const handleAddDefaultBikes = () => {
    const defSlots = getDefaultSlotsForCamera(selectedCamId)
    const bikeSlots = defSlots.filter(
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

    if (currentTool === 'bbox') {
      setBboxDragStart(pt)
      setBboxDragCurrent(pt)
      setSelectedSlotId(null)
    }
  }

  // Handle SVG Mouse Move
  const handleSvgMouseMove = (e) => {
    const pt = getSvgCoordinates(e)
    setCursorPos(pt)

    // BBox dragging in progress
    if (currentTool === 'bbox' && bboxDragStart) {
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
            // Recompute bounding box
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
      }
    }
  }

  // Handle SVG Mouse Up
  const handleSvgMouseUp = () => {
    if (dragging) {
      setDragging(null)
      return
    }

    // Finish BBox Dragging
    if (currentTool === 'bbox' && bboxDragStart && bboxDragCurrent) {
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

  // Handle SVG Click (Used for 4-point polygon drawing)
  const handleSvgClick = (e) => {
    // If clicking on polygon tool
    if (currentTool === 'polygon') {
      const pt = getSvgCoordinates(e)
      const updatedDraft = [...polygonDraft, pt]

      if (updatedDraft.length < 4) {
        setPolygonDraft(updatedDraft)
      } else {
        // Completed 4-point polygon!
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
        showToast(`สร้างช่องจอด ${newId} (${drawType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'} Polygon) สำเร็จ!`)
      }
    }
  }

  // Cancel in-progress polygon
  const handleCancelPolygon = () => {
    setPolygonDraft([])
    showToast('ยกเลิกการวาด Polygon แล้ว', 'info')
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
    const newId = getNextSlotId()
    const offset = 30
    const newPoints = slot.points.map((p) => ({
      x: Math.min(NATIVE_WIDTH, p.x + offset),
      y: Math.min(NATIVE_HEIGHT, p.y + offset)
    }))
    const newSlot = {
      ...slot,
      id: newId,
      points: newPoints,
      bbox: {
        x: Math.min(NATIVE_WIDTH, slot.bbox.x + offset),
        y: Math.min(NATIVE_HEIGHT, slot.bbox.y + offset),
        width: slot.bbox.width,
        height: slot.bbox.height
      }
    }
    setSlots((prev) => [...prev, newSlot])
    setSelectedSlotId(newId)
    showToast(`คัดลอกช่อง ${slot.id} เป็น ${newId}`)
  }

  // Reset to default sample slots for active camera
  const handleResetDefaults = () => {
    if (window.confirm(`คุณต้องการรีเซ็ตช่องจอดของ ${activeCam.code} (${activeCam.name}) กลับเป็นค่าเริ่มต้นใช่หรือไม่?`)) {
      const defs = resetCameraSlots(selectedCamId)
      setSlots(defs)
      setSelectedSlotId(null)
      setPolygonDraft([])
      showToast(`รีเซ็ตช่องจอดของ ${activeCam.code} เรียบร้อยแล้ว`)
    }
  }

  // Clear all slots for active camera
  const handleClearAll = () => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้างช่องจอดทั้งหมดของ ${activeCam.code}?`)) {
      setSlots([])
      setSelectedSlotId(null)
      setPolygonDraft([])
      showToast(`ล้างช่องจอดทั้งหมดของ ${activeCam.code} แล้ว`)
    }
  }

  // Update a slot's field (id, type, etc)
  const handleUpdateSlotField = (slotId, field, val) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, [field]: val } : s))
    )
  }

  // Generate standardized JSON for export
  const getExportData = () => {
    return {
      version: '1.0.0',
      camera_id: selectedCamId,
      camera_code: activeCam.code,
      camera_name: activeCam.name,
      location: activeCam.location,
      zone: activeCam.zone,
      reference_image: currentRecord.filename,
      image_dimensions: {
        width: NATIVE_WIDTH,
        height: NATIVE_HEIGHT
      },
      exported_at: new Date().toISOString(),
      total_slots: slots.length,
      car_slots: slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike').length,
      motorcycle_slots: slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length,
      slots: slots.map((s) => ({
        slot_id: s.id,
        type: s.type || 'car',
        shape: s.shape || 'polygon',
        occupied: !!s.occupied,
        vehicle_name: s.vehicle_name || '',
        // Absolute pixel points (1600x1200)
        points: s.points,
        // Normalized points (0.0 to 1.0) for AI frameworks (YOLO, PyTorch, TensorRT)
        normalized_points: s.points.map((p) => ({
          x: parseFloat((p.x / NATIVE_WIDTH).toFixed(5)),
          y: parseFloat((p.y / NATIVE_HEIGHT).toFixed(5))
        })),
        bbox: s.bbox,
        normalized_bbox: {
          x: parseFloat((s.bbox.x / NATIVE_WIDTH).toFixed(5)),
          y: parseFloat((s.bbox.y / NATIVE_HEIGHT).toFixed(5)),
          width: parseFloat((s.bbox.width / NATIVE_WIDTH).toFixed(5)),
          height: parseFloat((s.bbox.height / NATIVE_HEIGHT).toFixed(5))
        }
      }))
    }
  }

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(getExportData(), null, 2)
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast(`คัดลอก JSON พิกัดช่องจอดของ ${activeCam.code} เรียบร้อยแล้ว!`)
    })
  }

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(getExportData(), null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cpe_parking_slots_${selectedCamId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(`ดาวน์โหลดไฟล์ JSON ของ ${activeCam.code} เรียบร้อยแล้ว`)
  }

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText)
      const importedSlots = parsed.slots || parsed
      if (!Array.isArray(importedSlots)) {
        throw new Error('Invalid JSON structure: slots array not found')
      }
      const formatted = importedSlots.map((item, idx) => ({
        id: item.slot_id || item.id || `${activeCam.defaultCarPrefix}${(idx + 1).toString().padStart(2, '0')}`,
        type: item.type || 'car',
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
            <MapPin className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Setup Parking Slot (พิกัดช่องจอด ROI)
              </h2>
              <span className="badge-chip badge-chip-live">
                <span>MULTI-CAMERA ROI EDITOR</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              วาดและกำหนดพิกัดช่องจอดแยกตามจุดติดตั้งกล้องจริง ({activeCam.code} • {activeCam.name})
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
            onClick={handleSaveRoiToServer}
            disabled={isSyncingServer}
            className="btn-setup-export"
            style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))', borderColor: 'rgba(16, 185, 129, 0.5)', color: '#6ee7b7' }}
            title="บันทึกพิกัด ROI ไปยัง Server ให้ AI YOLO ใช้งานทันที"
          >
            <Save className={`w-4 h-4 text-emerald-400 ${isSyncingServer ? 'animate-spin' : ''}`} />
            <span>{isSyncingServer ? 'กำลังบันทึก...' : '💾 บันทึก ROI ไปยัง Server'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="btn-setup-export"
            title="บันทึกและ Export พิกัดช่องจอดเป็น JSON"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
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
              เลือกกล้องที่ต้องการวาดช่องจอด ({SYSTEM_CAMERAS.length} จุดติดตั้ง):
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            ดึงภาพสด Snapshot จากกล้อง ESP32 แต่ละตัวเพื่อวาดและปรับแต่งตำแหน่งช่องจอด
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
                      <span className="cam-tab-custom-badge" title="มีภาพอัปโหลดเฉพาะของกล้องนี้">
                        CUSTOM
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                        LIVE FEED
                      </span>
                    )}
                    <span className="cam-switcher-zone">{cam.zoneName}</span>
                  </div>
                </div>

                <div className="cam-switcher-name text-left">{cam.name}</div>
                <div className="text-[10px] text-slate-400 text-left font-mono mt-0.5">{cam.device}</div>

                <div className="cam-switcher-stats mt-1">
                  <span className="stat-pill car">
                    🚗 รถยนต์: <strong>{counts.car.total}</strong> ({counts.car.free} ว่าง)
                  </span>
                  <span className="stat-pill bike">
                    🏍️ มอเตอร์ไซค์: <strong>{counts.bike.total}</strong> ({counts.bike.free} ว่าง)
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Work Area: Canvas on Left, Controls & List on Right */}
      <div className="setup-workspace-grid">
        {/* Left Column: Canvas Viewport & Toolbar */}
        <div className="setup-canvas-panel">
          {/* Top Canvas Toolbar */}
          <div className="canvas-toolbar">
            {/* Group 1: Tools & Vehicle Type */}
            <div className="toolbar-group">
              <span className="toolbar-label">โหมด:</span>
              <button
                type="button"
                className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTool('select')
                  setPolygonDraft([])
                }}
                title="เลือกและขยับจุดพิกัด (Select & Move)"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Move & Edit</span>
              </button>

              <button
                type="button"
                className={`vehicle-type-pill car ${currentTool !== 'select' && drawType === 'car' ? 'active' : ''}`}
                onClick={() => {
                  setDrawType('car')
                  setNextSlotPrefix(activeCam.defaultCarPrefix)
                  if (currentTool === 'select') setCurrentTool('polygon')
                }}
                title={`วาดช่องจอดรถยนต์สำหรับ ${activeCam.code} (รหัส ${activeCam.defaultCarPrefix}..)`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>วาดรถยนต์ ({activeCam.defaultCarPrefix}..)</span>
              </button>

              <button
                type="button"
                className={`vehicle-type-pill bike ${currentTool !== 'select' && drawType === 'motorcycle' ? 'active' : ''}`}
                onClick={() => {
                  setDrawType('motorcycle')
                  setNextSlotPrefix(activeCam.defaultBikePrefix)
                  if (currentTool === 'select') setCurrentTool('polygon')
                }}
                title={`วาดช่องจอดมอเตอร์ไซค์สำหรับ ${activeCam.code} (รหัส ${activeCam.defaultBikePrefix}..)`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>วาดมอเตอร์ไซค์ ({activeCam.defaultBikePrefix}..)</span>
              </button>
            </div>

            {/* Group 2: Shape Format */}
            <div className="toolbar-group">
              <button
                type="button"
                className={`tool-btn ${currentTool === 'polygon' ? 'active' : ''}`}
                onClick={() => setCurrentTool('polygon')}
                title="คลิก 4 มุมช่องจอด (4-Point Polygon)"
              >
                <Pentagon className="w-3.5 h-3.5 text-amber-400" />
                <span>4-Pt Polygon</span>
              </button>

              <button
                type="button"
                className={`tool-btn ${currentTool === 'bbox' ? 'active' : ''}`}
                onClick={() => setCurrentTool('bbox')}
                title="คลิกลากกล่องสี่เหลี่ยม (BBox)"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Box</span>
              </button>

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

            {/* Group 3: Real Camera Live Feed & MinIO Snapshots */}
            <div className="toolbar-group">
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
                <span>ดึงภาพสด (Live)</span>
              </button>

              <button
                type="button"
                className={`tool-btn ${autoLivePolling ? 'active' : ''}`}
                onClick={() => setAutoLivePolling(!autoLivePolling)}
                title="เปิด/ปิด การดึงภาพสดอัตโนมัติทุก 4 วิ"
              >
                <span className={`w-2 h-2 rounded-full ${autoLivePolling ? 'bg-rose-400 animate-ping' : 'bg-slate-500'}`}></span>
                <span>{autoLivePolling ? 'Live (4s)' : 'Auto'}</span>
              </button>

              {recentFrames.length > 0 && (
                <select
                  className="snapshot-select-input"
                  value={selectedFrameIndex}
                  onChange={(e) => setSelectedFrameIndex(Number(e.target.value))}
                  title="เลือกภาพถ่ายในอดีตจาก MinIO"
                >
                  <option value={-1}>🔴 ภาพสดล่าสุด (Live Snapshot)</option>
                  {recentFrames.map((r, i) => (
                    <option key={r.id || i} value={i}>
                      #{i + 1} • {r.local_time ? r.local_time.split(' ')[1] : r.filename}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="tool-btn"
                onClick={() => fileInputRef.current?.click()}
                title={`อัปโหลดภาพนิ่งจากอุปกรณ์สำหรับกล้อง ${activeCam.code}`}
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>อัปโหลด</span>
              </button>

              {customCamImage && (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={handleResetImage}
                  title="คืนค่ากลับเป็นภาพสดของกล้องนี้"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>คืนค่าภาพสด</span>
                </button>
              )}
            </div>

            {/* Group 4: Quick Toggles & Reset */}
            <div className="toolbar-group">
              <button
                type="button"
                className={`icon-toggle-btn ${showLabels ? 'active' : ''}`}
                onClick={() => setShowLabels(!showLabels)}
                title="เปิด/ปิด ป้ายชื่อรหัสช่องจอด"
              >
                {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>Labels</span>
              </button>

              <button
                type="button"
                className="icon-toggle-btn"
                onClick={handleResetDefaults}
                title={`รีเซ็ตช่องจอดของ ${activeCam.code} กลับเป็นค่าเริ่มต้น`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                className="icon-toggle-btn danger"
                onClick={handleClearAll}
                title={`ล้างช่องจอดทั้งหมดของ ${activeCam.code}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div
            className={`roi-viewport-wrapper ${currentTool}`}
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

              {/* Render All Confirmed Parking Slots */}
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
                      onMouseDown={(e) => handleShapeMouseDown(e, slot)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSlotId(slot.id)
                      }}
                    />

                    {/* Corner Vertex Handles (when selected) */}
                    {isSelected &&
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
                          {isBike ? '🏍️ ' : '🚗 '}{slot.id}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Active Polygon Draft in Progress */}
              {polygonDraft.length > 0 && (
                <g className="polygon-draft-group">
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
                        {drawType === 'motorcycle' ? '🏍️' : '🚗'} จุดที่ {idx + 1}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* Active BBox Drag Preview */}
              {currentTool === 'bbox' && bboxDragStart && bboxDragCurrent && (
                <rect
                  x={Math.min(bboxDragStart.x, bboxDragCurrent.x)}
                  y={Math.min(bboxDragStart.y, bboxDragCurrent.y)}
                  width={Math.abs(bboxDragCurrent.x - bboxDragStart.x)}
                  height={Math.abs(bboxDragCurrent.y - bboxDragStart.y)}
                  className={`bbox-drag-preview ${drawType === 'motorcycle' ? 'bike-bbox' : 'car-bbox'}`}
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
                <strong>วิธีใช้งาน:</strong> เลือก <strong>"4-Pt Polygon"</strong> เพื่อคลิก 4 มุมช่องจอดตามระนาบถนน หรือเลือก <strong>"Box (BBox)"</strong> คลิกลากเพื่อวาดกล่องสี่เหลี่ยม จากนั้นใช้ <strong>"Select & Move"</strong> เพื่อขยับจุดหรือแก้ไข
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Slot Management & Inspector Pane */}
        <div className="setup-inspector-panel">
          {/* Summary KPIs */}
          <div className="inspector-card">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Slot Registry • {activeCam.code} ({slots.length})
                </h3>
              </div>
              <div className="flex gap-2">
                <span className="mini-chip bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🚗 รถยนต์: {slots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike').length}
                </span>
                <span className="mini-chip bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  🏍️ มอเตอร์ไซค์: {slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length}
                </span>
              </div>
            </div>

            {/* If no motorcycle slots yet, show quick helper button */}
            {slots.filter((s) => s.type === 'motorcycle' || s.type === 'bike').length === 0 && (
              <div className="mt-2.5 p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs flex items-center justify-between">
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

            {/* Quick Auto-Naming Prefix Setting */}
            <div className="pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                รหัสเริ่มต้นถัดไป ({drawType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'}):
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-emerald-400 font-bold bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  {getNextSlotId()}
                </span>
              </div>
            </div>
          </div>

          {/* Selected Slot Detailed Inspector */}
          {selectedSlot ? (
            <div className="inspector-card active-slot-card">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-emerald-400">
                    {selectedSlot.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({selectedSlot.shape === 'bbox' ? 'Bounding Box' : '4-Point Polygon'})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn-icon-action"
                    onClick={() => handleDuplicateSlot(selectedSlot)}
                    title="คัดลอกช่องนี้"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon-action danger"
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
                    <Car className="w-3.5 h-3.5 text-blue-400" />
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600 }}>สถานะจำลอง (Simulation):</label>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
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
              <div className="inspector-field">
                <label>ขนาด Bounding Box:</label>
                <div className="text-xs font-mono text-slate-300 bg-black/40 p-2 rounded border border-white/5 flex justify-between">
                  <span>X: {selectedSlot.bbox.x} Y: {selectedSlot.bbox.y}</span>
                  <span>W: {selectedSlot.bbox.width}px H: {selectedSlot.bbox.height}px</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="inspector-card text-center py-6">
              <MousePointer className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                คลิกเลือกช่องจอดในภาพ หรือในรายการด้านล่างเพื่อแก้ไขพิกัดและรหัสช่อง
              </p>
            </div>
          )}

          {/* Slot List Scroll Area */}
          <div className="inspector-card flex-1 min-h-0 flex flex-col">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              รายการช่องจอดทั้งหมด ({slots.length})
            </h4>

            <div className="slots-list-scrollable">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`slot-item-row ${slot.id === selectedSlotId ? 'active' : ''}`}
                  onClick={() => setSelectedSlotId(slot.id)}
                >
                  <div className="slot-row-meta">
                    <span className="slot-badge-id font-mono font-bold">
                      {slot.id}
                    </span>
                    <span className={`slot-type-chip ${slot.type === 'motorcycle' || slot.type === 'bike' ? 'bike' : 'car'}`}>
                      {slot.type === 'motorcycle' || slot.type === 'bike' ? '🏍️ มอเตอร์ไซค์' : '🚗 รถยนต์'}
                    </span>
                    <span className={`slot-status-chip ${slot.occupied ? 'occupied' : 'vacant'}`}>
                      {slot.occupied ? 'มีรถ' : 'ว่าง'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
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
                      <Copy className="w-3 h-3 text-slate-400 hover:text-white" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-tiny hover:text-rose-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSlot(slot.id)
                      }}
                      title="ลบ"
                    >
                      <Trash2 className="w-3 h-3 text-slate-500 hover:text-rose-400" />
                    </button>
                  </div>
                </div>
              ))}

              {slots.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  ยังไม่มีช่องจอด เริ่มวาดด้วยเครื่องมือด้านซ้ายได้ทันที
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export JSON Modal */}
      {showExportModal && (
        <div className="camera-modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div
            className="camera-modal-dialog max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-bar">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="modal-title">Export Parking Slots ROI (JSON)</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowExportModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-300 mb-3">
                พิกัดช่องจอดพร้อมใช้งานสำหรับระบบ AI Inference, FastAPI, และโมเดลทำนายการครอบครองที่จอด:
              </p>

              <pre className="json-preview-box">
                {JSON.stringify(getExportData(), null, 2)}
              </pre>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-400">
                  บันทึกแล้วใน Browser LocalStorage อัตโนมัติ
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="btn-secondary-action"
                  >
                    <Copy className="w-4 h-4 text-cyan-400" />
                    <span>Copy JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="btn-save-setup flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="camera-modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div
            className="camera-modal-dialog max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-bar">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h3 className="modal-title">Import Parking Slots ROI</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowImportModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-300 mb-2">
                วางข้อความ JSON พิกัดช่องจอดที่คุณบันทึกไว้:
              </p>

              <textarea
                className="w-full h-48 bg-black/60 border border-slate-700 rounded-lg p-3 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                placeholder='{"slots": [{"slot_id": "A01", "type": "car", "points": [...]}]}'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleImportJson}
                  disabled={!importJsonText.trim()}
                  className="btn-save-setup disabled:opacity-50"
                >
                  นำเข้าพิกัด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
