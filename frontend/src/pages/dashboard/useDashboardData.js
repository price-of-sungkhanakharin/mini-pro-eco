import { useState, useEffect } from 'react'
import {
  loadDumpMetadata,
  formatTimestampThai,
  formatSnapshotTimeInfo,
  getSavedOrInitialSlots,
  calculateSlotCounts,
  getCameraImage,
  syncAllSlotsFromServer,
  fetchLiveParkStatus,
  getIngestionApiBase,
  checkCameraOnlineStatus
} from '../../utils/dumpData'

/**
 * Evaluates 3-tier car vacancy prediction status based on actual free car count (k).
 */
export function getCarVacancyStatus(freeCar) {
  if (typeof freeCar !== 'number' || freeCar < 0) return null
  if (freeCar >= 2) {
    return {
      level: 'high',
      text: 'โอกาสมีที่จอดสูง',
      colorClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    }
  }
  if (freeCar === 1) {
    return {
      level: 'medium',
      text: 'โอกาสปานกลาง',
      colorClass: 'text-amber-400',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    }
  }
  return {
    level: 'full',
    text: 'เต็ม',
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  }
}

/**
 * Evaluates 3-tier motorcycle vacancy prediction status based on free motorcycle count.
 */
export function getBikeVacancyStatus(freeBike, totalBike = 25) {
  if (typeof freeBike !== 'number' || freeBike < 0) return null
  if (freeBike >= 3 || (totalBike > 0 && freeBike / totalBike >= 0.15)) {
    return {
      level: 'high',
      text: 'โอกาสมีที่จอดสูง',
      colorClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    }
  }
  if (freeBike >= 1) {
    return {
      level: 'medium',
      text: 'โอกาสปานกลาง',
      colorClass: 'text-amber-400',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    }
  }
  return {
    level: 'full',
    text: 'เต็ม',
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  }
}

export function useDashboardData() {
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
  const [frameIndex, setFrameIndex] = useState(29)
  const [liveData, setLiveData] = useState(null)
  const [liveParkStatus, setLiveParkStatus] = useState({})
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
      // Fallback silently
    }

    try {
      const pData = await fetchLiveParkStatus()
      if (Array.isArray(pData) && pData.length > 0) {
        const map = {}
        pData.forEach((item) => {
          if (item && item.camera_id) map[item.camera_id] = item
        })
        setLiveParkStatus(map)
      }
    } catch (err) {
      // Fallback silently
    }
  }

  // Poll live camera telemetry every 3s
  useEffect(() => {
    fetchLiveTelemetry()
    const liveTimer = setInterval(fetchLiveTelemetry, 3000)
    return () => clearInterval(liveTimer)
  }, [])

  // Synchronize and poll parking slots from central server
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

  // Calculate live slot metrics dynamically from real-time AI detection status
  const getCameraCounts = (camId, localSlots) => {
    const s = liveParkStatus[camId]
    if (s && (s.total_capacity > 0 || s.car_capacity !== undefined || s.bike_capacity !== undefined)) {
      const carCap = s.car_capacity ?? (s.vehicle_type === 'car' ? s.total_capacity : (camId === 'cam1' ? 6 : (camId === 'cam2' ? 5 : 0)))
      const carOcc = s.car_occupied ?? (s.vehicle_type === 'car' ? s.occupied_count : (camId === 'cam3' ? 0 : Math.min(carCap, s.occupied_count)))
      const carFree = s.car_vacant ?? Math.max(0, carCap - carOcc)

      const bikeCap = s.bike_capacity ?? (s.vehicle_type === 'motorcycle' ? s.total_capacity : (camId === 'cam1' ? 9 : (camId === 'cam2' ? 13 : 25)))
      const bikeOcc = s.bike_occupied ?? (s.vehicle_type === 'motorcycle' ? s.occupied_count : Math.max(0, s.occupied_count - carOcc))
      const bikeFree = s.bike_vacant ?? Math.max(0, bikeCap - bikeOcc)

      return {
        car: { free: carFree, total: carCap, occupied: carOcc },
        bike: { free: bikeFree, total: bikeCap, occupied: bikeOcc }
      }
    }
    return calculateSlotCounts(localSlots)
  }

  const cam1Counts = getCameraCounts('cam1', cam1Slots)
  const cam2Counts = getCameraCounts('cam2', cam2Slots)
  const cam3Counts = getCameraCounts('cam3', cam3Slots)

  // Load real dump metadata
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

  // Extract raw timestamps
  const cam1RawTime = cam1Live?.timestamp || liveParkStatus?.cam1?.timestamp || liveParkStatus?.cam1?.created_at || null
  const cam2RawTime = cam2Live?.timestamp || liveParkStatus?.cam2?.timestamp || liveParkStatus?.cam2?.created_at || null
  const cam3RawTime = cam3Live?.timestamp || liveParkStatus?.cam3?.timestamp || liveParkStatus?.cam3?.created_at || null

  // Evaluate Online/Offline status based on 15-minute frame age threshold
  const cam1Status = checkCameraOnlineStatus(cam1RawTime, 15)
  const cam2Status = checkCameraOnlineStatus(cam2RawTime, 15)
  const cam3Status = checkCameraOnlineStatus(cam3RawTime, 15)

  // Compute detailed formatted snapshot time info
  const cam1TimeInfo = formatSnapshotTimeInfo(cam1RawTime)
  const cam2TimeInfo = formatSnapshotTimeInfo(cam2RawTime)
  const cam3TimeInfo = formatSnapshotTimeInfo(cam3RawTime)

  const cam1Image = cam1CustomImage || `${INGESTION_API}/api/v1/line/snapshot/cam1?mode=${showRoiOverlay ? 'dashboard' : 'raw'}&t=${imgKey}`
  const cam2Image = cam2CustomImage || `${INGESTION_API}/api/v1/line/snapshot/cam2?mode=${showRoiOverlay ? 'dashboard' : 'raw'}&t=${imgKey}`
  const cam3Image = cam3CustomImage || `${INGESTION_API}/api/v1/line/snapshot/cam3?mode=${showRoiOverlay ? 'dashboard' : 'raw'}&t=${imgKey}`

  const cam1 = {
    id: 1,
    camId: 'cam1',
    slotCode: 'CAM-01',
    name: 'หน้าภาค (ลานหน้าภาควิชาคอมพิวเตอร์ 1)',
    subtitle: 'Zone A - หน้าภาค 1 (รถยนต์)',
    device: 'Edge Node (ESP32-CAM / Cam1)',
    zone: 'zone_a',
    ip: cam1Live?.client_ip || '172.30.91.44',
    fps: cam1Status.isOnline ? '0.2 fps (ทุก 5s)' : '0.0 fps (ออฟไลน์)',
    status: cam1Status.status,
    isOnline: cam1Status.isOnline,
    statusInfo: cam1Status,
    timeInfo: cam1TimeInfo,
    snapshotTime: cam1TimeInfo.formattedTime,
    snapshotFullDate: cam1TimeInfo.formattedFull,
    snapshotRelative: cam1TimeInfo.relativeText,
    latency: cam1Status.isOnline ? '28ms' : 'No Signal',
    imageUrl: cam1Image,
    snapshotTimestamp: cam1RawTime ? cam1RawTime.replace('T', ' ').substring(0, 19) : 'ไม่มีสัญญาณภาพ',
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
    carVacancyStatus: cam1Counts.car.total > 0 ? getCarVacancyStatus(cam1Counts.car.free) : null,
    slots: cam1Slots
  }

  const cam2 = {
    id: 2,
    camId: 'cam2',
    slotCode: 'CAM-02',
    name: 'ลานจอดรถในร่มข้างอาคาร (หน้าภาค 2)',
    subtitle: 'Zone B - หน้าภาค 2 (รถยนต์)',
    device: 'Edge Node (ESP32-CAM / Cam2)',
    zone: 'zone_b',
    ip: cam2Live?.client_ip || '172.30.92.108',
    fps: cam2Status.isOnline ? '0.2 fps (ทุก 5s)' : '0.0 fps (ออฟไลน์)',
    status: cam2Status.status,
    isOnline: cam2Status.isOnline,
    statusInfo: cam2Status,
    timeInfo: cam2TimeInfo,
    snapshotTime: cam2TimeInfo.formattedTime,
    snapshotFullDate: cam2TimeInfo.formattedFull,
    snapshotRelative: cam2TimeInfo.relativeText,
    latency: cam2Status.isOnline ? '31ms' : 'No Signal',
    imageUrl: cam2Image,
    snapshotTimestamp: cam2RawTime ? cam2RawTime.replace('T', ' ').substring(0, 19) : 'ไม่มีสัญญาณภาพ',
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
    carVacancyStatus: cam2Counts.car.total > 0 ? getCarVacancyStatus(cam2Counts.car.free) : null,
    slots: cam2Slots
  }

  const cam3 = {
    id: 3,
    camId: 'cam3',
    slotCode: 'CAM-03',
    name: 'ลานข้างตึกภาคคอม (มอเตอร์ไซค์)',
    subtitle: 'Zone C - ข้างภาคคอม (มอเตอร์ไซค์)',
    device: 'Edge Node (ESP32-CAM / Cam3)',
    zone: 'zone_c',
    ip: cam3Live?.client_ip || '172.30.92.100',
    fps: cam3Status.isOnline ? '0.2 fps (ทุก 5s)' : '0.0 fps (ออฟไลน์)',
    status: cam3Status.status,
    isOnline: cam3Status.isOnline,
    statusInfo: cam3Status,
    timeInfo: cam3TimeInfo,
    snapshotTime: cam3TimeInfo.formattedTime,
    snapshotFullDate: cam3TimeInfo.formattedFull,
    snapshotRelative: cam3TimeInfo.relativeText,
    latency: cam3Status.isOnline ? '36ms' : 'No Signal',
    imageUrl: cam3Image,
    snapshotTimestamp: cam3RawTime ? cam3RawTime.replace('T', ' ').substring(0, 19) : 'ไม่มีสัญญาณภาพ',
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
    bikeVacancyStatus: cam3Counts.bike.total > 0 ? getBikeVacancyStatus(cam3Counts.bike.free, cam3Counts.bike.total) : null,
    slots: cam3Slots
  }

  const totalCarFree = cam1Counts.car.free + cam2Counts.car.free + cam3Counts.car.free
  const totalCarTotal = cam1Counts.car.total + cam2Counts.car.total + cam3Counts.car.total
  const totalBikeFree = cam1Counts.bike.free + cam2Counts.bike.free + cam3Counts.bike.free
  const totalBikeTotal = cam1Counts.bike.total + cam2Counts.bike.total + cam3Counts.bike.total
  const totalOverallFree = totalCarFree + totalBikeFree
  const totalOverallCapacity = totalCarTotal + totalBikeTotal
  const avgChance = totalOverallCapacity > 0 ? Math.min(99, Math.max(30, Math.round((totalOverallFree / totalOverallCapacity) * 100 + 8))) : 79

  return {
    selectedZone,
    setSelectedZone,
    countdown,
    isRefreshing,
    handleManualRefresh,
    simulatedTime,
    showRoiOverlay,
    setShowRoiOverlay,
    cam1,
    cam2,
    cam3,
    cam1Counts,
    cam2Counts,
    cam3Counts,
    cam1Live,
    totalCarFree,
    totalCarTotal,
    totalBikeFree,
    totalBikeTotal,
    totalOverallFree,
    totalOverallCapacity,
    avgChance,
    currentRecord
  }
}
