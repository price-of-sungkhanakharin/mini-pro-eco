/**
 * Real dump telemetry and image dataset helper for CPE Smart Parking AI.
 * Dataset source: /Users/pittachiox/Downloads/dev_dump_2026-09-22_1800
 * Location: front_dept (หน้าภาควิชาคอมพิวเตอร์), Camera: cam1
 */

// Fallback preloaded snapshot records from metadata.json
export const FALLBACK_DUMP_RECORDS = [
  {
    id: 12796,
    camera_id: 'cam1',
    location: 'front_dept',
    location_name: 'หน้าภาควิชาคอมพิวเตอร์',
    timestamp: '2026-09-22T11:00:01.666860+00:00',
    local_time: '2026-09-22 18:00:01',
    filename: '2026-09-22_18-00-01_562.jpg',
    client_ip: '172.30.91.108',
    chip_temp_c: 80.0,
    uptime_sec: 2139,
    free_heap: 156704,
    free_psram: 3419476,
    wifi_rssi_dbm: -82,
    light_aec_value: 490,
    status: 'ONLINE (HEALTHY)'
  },
  {
    id: 12800,
    camera_id: 'cam1',
    location: 'front_dept',
    location_name: 'หน้าภาควิชาคอมพิวเตอร์',
    timestamp: '2026-09-22T11:00:20.397510+00:00',
    local_time: '2026-09-22 18:00:20',
    filename: '2026-09-22_18-00-20_283.jpg',
    client_ip: '172.30.91.108',
    chip_temp_c: 79.4,
    uptime_sec: 2159,
    free_heap: 156704,
    free_psram: 3419476,
    wifi_rssi_dbm: -82,
    light_aec_value: 490,
    status: 'ONLINE (HEALTHY)'
  },
  {
    id: 12810,
    camera_id: 'cam1',
    location: 'front_dept',
    location_name: 'หน้าภาควิชาคอมพิวเตอร์',
    timestamp: '2026-09-22T11:01:11.306239+00:00',
    local_time: '2026-09-22 18:01:11',
    filename: '2026-09-22_18-01-11_205.jpg',
    client_ip: '172.30.91.108',
    chip_temp_c: 80.0,
    uptime_sec: 2210,
    free_heap: 156704,
    free_psram: 3419476,
    wifi_rssi_dbm: -81,
    light_aec_value: 490,
    status: 'ONLINE (HEALTHY)'
  },
  {
    id: 12820,
    camera_id: 'cam1',
    location: 'front_dept',
    location_name: 'หน้าภาควิชาคอมพิวเตอร์',
    timestamp: '2026-09-22T11:02:03.181283+00:00',
    local_time: '2026-09-22 18:02:03',
    filename: '2026-09-22_18-02-03_071.jpg',
    client_ip: '172.30.91.108',
    chip_temp_c: 80.6,
    uptime_sec: 2262,
    free_heap: 156704,
    free_psram: 3419476,
    wifi_rssi_dbm: -82,
    light_aec_value: 490,
    status: 'ONLINE (HEALTHY)'
  },
  {
    id: 12825,
    camera_id: 'cam1',
    location: 'front_dept',
    location_name: 'หน้าภาควิชาคอมพิวเตอร์',
    timestamp: '2026-09-22T11:02:29.088777+00:00',
    local_time: '2026-09-22 18:02:28',
    filename: '2026-09-22_18-02-28_966.jpg',
    client_ip: '172.30.91.108',
    chip_temp_c: 81.1,
    uptime_sec: 2288,
    free_heap: 156704,
    free_psram: 3419476,
    wifi_rssi_dbm: -82,
    light_aec_value: 490,
    status: 'ONLINE (HEALTHY)'
  }
]

export const getIngestionApiBase = () => {
  if (typeof window !== 'undefined') {
    // In browser, relative URL ('') uses Vite/Nginx dev proxy on the active port,
    // avoiding CORS or firewall issues when accessing remote server IPs.
    return ''
  }
  return 'http://localhost:5005'
}

/**
 * Fetch real live logs directly from the Ingestion Server / MinIO dataset
 */
export async function fetchRealServerLogs({
  limit = 200,
  page = 1,
  camera_id = 'all',
  date = 'all',
  temp_filter = 'all',
  search = '',
  sort = 'desc',
  source = 'db'
} = {}) {
  const apiBase = getIngestionApiBase()
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit)
  if (page) params.set('page', page)
  if (camera_id && camera_id !== 'all') params.set('camera_id', camera_id)
  if (date && date !== 'all') params.set('date', date)
  if (temp_filter && temp_filter !== 'all') params.set('temp_filter', temp_filter)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (source) params.set('source', source)

  try {
    const res = await fetch(`${apiBase}/api/logs?${params.toString()}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && Array.isArray(data.records)) {
      const records = data.records.map((rec) => ({
        ...rec,
        image_url: rec.image_url?.startsWith('http') ? rec.image_url : `${apiBase}${rec.image_url}`,
        json_url: rec.json_url?.startsWith('http') ? rec.json_url : `${apiBase}${rec.json_url}`,
      }))
      return {
        success: true,
        records,
        total: data.total ?? records.length,
        available_dates: data.available_dates || [],
        stats: data.stats || {},
        page: data.page || 1,
        pages: data.pages || 1
      }
    }
  } catch (err) {
    console.warn('Could not fetch from real ingestion server, attempting fallback:', err)
  }

  // Fallback to legacy dump
  const fallback = await loadDumpMetadata()
  return {
    success: false,
    records: fallback,
    total: fallback.length,
    available_dates: ['2026-09-22'],
    stats: {
      total_records: fallback.length,
      avg_temp: 80.2,
      high_temp_count: 5,
      avg_heap: 153,
      minio_bucket: 'raw-datasets',
      minio_connected: true
    },
    page: 1,
    pages: 1
  }
}

/**
 * Fetch and normalize records from Ingestion Server API, falling back to public/dump_data/metadata.json
 */
export async function loadDumpMetadata() {
  try {
    // Try real server first
    const realResult = await fetchRealServerLogs({ limit: 100 })
    if (realResult.success && realResult.records.length > 0) {
      return realResult.records
    }

    // Secondary fallback
    const res = await fetch('/dump_data/metadata.json')
    if (!res.ok) {
      throw new Error(`Failed to load metadata.json: ${res.statusText}`)
    }
    const rawList = await res.json()
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return FALLBACK_DUMP_RECORDS
    }

    return rawList.map((item, index) => {
      const fn =
        item.raw_metadata?.filename ||
        (item.image_path ? item.image_path.split('/').pop() : `frame_${index}.jpg`)
      const clientIp = item.raw_metadata?.client_ip || '172.30.91.108'
      const sidecarTelemetry = item.raw_metadata?.telemetry || {}
      const chipTemp = parseFloat(item.chip_temp_c || sidecarTelemetry.chip_temp_c || 80.0)
      const uptime = parseInt(item.uptime_sec || sidecarTelemetry.uptime_sec || 2139, 10)
      const freeHeap = parseInt(item.free_heap || sidecarTelemetry.free_heap || 156704, 10)
      const freePsram = parseInt(sidecarTelemetry.free_psram || 3419476, 10)
      const wifiRssi = item.wifi_rssi ?? sidecarTelemetry.wifi_rssi_dbm ?? -82
      const aecVal = item.light_aec_value ?? sidecarTelemetry.aec_value ?? 490

      let localTime = '2026-09-22 18:00:00'
      const fnMatch = fn.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/)
      if (fnMatch) {
        localTime = `${fnMatch[1]} ${fnMatch[2]}:${fnMatch[3]}:${fnMatch[4]}`
      } else if (item.timestamp) {
        try {
          const d = new Date(item.timestamp)
          localTime = d.toLocaleString('sv-SE').replace('T', ' ')
        } catch {
          // ignore
        }
      }

      return {
        id: item.id || index + 1,
        index,
        camera_id: item.camera_id || 'cam1',
        location: item.location || 'front_dept',
        location_name: 'หน้าภาควิชาคอมพิวเตอร์',
        timestamp: item.timestamp,
        local_time: localTime,
        filename: fn,
        image_url: `/dump_data/images/${fn}`,
        client_ip: clientIp,
        chip_temp_c: chipTemp,
        uptime_sec: uptime,
        free_heap: freeHeap,
        free_psram: freePsram,
        wifi_rssi_dbm: wifiRssi,
        light_aec_value: aecVal,
        status: 'ONLINE (HEALTHY)'
      }
    })
  } catch (err) {
    console.warn('Using fallback dump records:', err)
    return FALLBACK_DUMP_RECORDS
  }
}

export function formatTimestampThai(localTimeStr) {
  if (!localTimeStr) return '22 ก.ย. 2026, 18:00:00 น.'
  if (localTimeStr.includes('T')) {
    localTimeStr = localTimeStr.replace('T', ' ').substring(0, 19)
  }
  // Accepts "2026-09-22 18:02:28"
  const parts = localTimeStr.split(' ')
  if (parts.length === 2) {
    const [y, m, d] = parts[0].split('-')
    const thaiMonths = [
      '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const mIdx = parseInt(m, 10)
    const monthName = thaiMonths[mIdx] || m
    return `${parseInt(d, 10)} ${monthName} ${y}, ${parts[1]} น.`
  }
  return localTimeStr
}

export function formatSnapshotTimeInfo(timestampStr) {
  if (!timestampStr || timestampStr === 'ไม่มีสัญญาณภาพ') {
    return {
      formattedFull: 'ไม่มีสัญญาณภาพ',
      formattedTime: '—',
      relativeText: 'ออฟไลน์',
      raw: null
    }
  }
  let dateObj = null
  try {
    const cleanStr = timestampStr.includes('T') ? timestampStr : timestampStr.replace(' ', 'T')
    dateObj = new Date(cleanStr)
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date(timestampStr)
    }
  } catch {
    dateObj = null
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return {
      formattedFull: timestampStr,
      formattedTime: timestampStr,
      relativeText: '',
      raw: timestampStr
    }
  }

  const hours = String(dateObj.getHours()).padStart(2, '0')
  const mins = String(dateObj.getMinutes()).padStart(2, '0')
  const secs = String(dateObj.getSeconds()).padStart(2, '0')
  const timeStr = `${hours}:${mins}:${secs} น.`

  const thaiMonths = [
    '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const day = dateObj.getDate()
  const month = thaiMonths[dateObj.getMonth() + 1] || (dateObj.getMonth() + 1)
  const year = dateObj.getFullYear()
  const fullStr = `${day} ${month} ${year}, ${timeStr}`

  const now = new Date()
  const diffSec = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  let rel = ''
  if (diffSec < 5) rel = 'เมื่อสักครู่'
  else if (diffSec < 60) rel = `${diffSec} วินาทีที่แล้ว`
  else if (diffSec < 3600) rel = `${Math.floor(diffSec / 60)} นาทีที่แล้ว`
  else rel = `${Math.floor(diffSec / 3600)} ชม. ที่แล้ว`

  return {
    formattedFull: fullStr,
    formattedTime: timeStr,
    relativeText: rel,
    raw: timestampStr
  }
}

/**
 * Evaluates whether a camera is online based on its last frame/telemetry timestamp.
 * If timestamp is older than maxAgeMinutes (default 15 minutes), mark as offline.
 */
export function checkCameraOnlineStatus(timestampStr, maxAgeMinutes = 15) {
  if (!timestampStr) {
    return {
      isOnline: false,
      diffMinutes: 999,
      diffSeconds: 99999,
      status: 'offline',
      statusText: 'OFFLINE (ไม่มีสัญญาณ)',
      diffText: 'ไม่พบสัญญาณ',
      lastSeenText: '-',
      badgeClass: 'offline'
    }
  }

  let recordTime = null
  try {
    const cleanStr = timestampStr.includes('T') ? timestampStr : timestampStr.replace(' ', 'T')
    recordTime = new Date(cleanStr)
    if (isNaN(recordTime.getTime())) {
      recordTime = new Date(timestampStr)
    }
  } catch (e) {
    recordTime = null
  }

  if (!recordTime || isNaN(recordTime.getTime())) {
    return {
      isOnline: false,
      diffMinutes: 999,
      diffSeconds: 99999,
      status: 'offline',
      statusText: 'OFFLINE (เวลาไม่ถูกต้อง)',
      diffText: 'เวลาไม่ถูกต้อง',
      lastSeenText: '-',
      badgeClass: 'offline'
    }
  }

  const now = new Date()
  const diffMs = now.getTime() - recordTime.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffMs / 60000)

  const lastSeenText = recordTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  let diffText = ''
  if (diffMinutes < 1) {
    diffText = `${Math.max(0, diffSeconds)} วินาทีที่แล้ว`
  } else if (diffMinutes < 60) {
    diffText = `${diffMinutes} นาทีที่แล้ว`
  } else {
    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    diffText = `${hours} ชม. ${mins} น. ที่แล้ว`
  }

  // If age exceeds maxAgeMinutes (15 mins)
  if (diffMinutes > maxAgeMinutes) {
    return {
      isOnline: false,
      diffMinutes: Math.max(0, diffMinutes),
      diffSeconds: Math.max(0, diffSeconds),
      status: 'offline',
      statusText: `OFFLINE (${diffText})`,
      diffText,
      lastSeenText,
      badgeClass: 'offline'
    }
  }

  return {
    isOnline: true,
    diffMinutes: Math.max(0, diffMinutes),
    diffSeconds: Math.max(0, diffSeconds),
    status: 'online',
    statusText: 'ONLINE • 5s',
    diffText,
    lastSeenText,
    badgeClass: 'online'
  }
}

export function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const remM = m % 60
    return `${h}ชม. ${remM}น.`
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export function formatHeapKb(bytes) {
  if (!bytes) return '156.7 KB'
  return `${(bytes / 1024).toFixed(1)} KB`
}

/**
 * Recommended realistic parking slots ROI for the 1600x1200 front_dept camera view
 */
export const DEFAULT_CAM1_SLOTS = []
export const SLOTS_STORAGE_KEY = 'cpe_parking_slots_cam1'
export const DEFAULT_CAM2_SLOTS = []
export const DEFAULT_CAM3_SLOTS = []

export const SYSTEM_CAMERAS = [
  {
    id: 'cam1',
    code: 'CAM-01',
    name: 'ลานหน้าภาค 1 (รถยนต์)',
    location: 'front_dept_1',
    target: 'car',
    capacity: 10,
    zone: 'zone_a',
    zoneName: 'Zone A - หน้าภาค 1 (รถยนต์)',
    device: 'ESP32-CAM (#1) • IP: 172.30.91.44',
    defaultCarPrefix: 'A',
    defaultBikePrefix: 'M',
    defaultImage: '/api/latest?camera_id=cam1&image=true',
    storageKey: 'cpe_parking_slots_cam1'
  },
  {
    id: 'cam2',
    code: 'CAM-02',
    name: 'ลานหน้าภาค 2 (รถยนต์)',
    location: 'front_dept_2',
    target: 'car',
    capacity: 10,
    zone: 'zone_b',
    zoneName: 'Zone B - หน้าภาค 2 (รถยนต์)',
    device: 'ESP32-CAM (#2) • IP: 172.30.92.108',
    defaultCarPrefix: 'B',
    defaultBikePrefix: 'MB',
    defaultImage: '/api/latest?camera_id=cam2&image=true',
    storageKey: 'cpe_parking_slots_cam2'
  },
  {
    id: 'cam3',
    code: 'CAM-03',
    name: 'ลานข้างภาคคอม (มอเตอร์ไซค์)',
    location: 'side_dept',
    target: 'motorcycle',
    capacity: 20,
    zone: 'zone_c',
    zoneName: 'Zone C - ข้างภาคคอม (มอเตอร์ไซค์)',
    device: 'ESP32-CAM (#3) • IP: 172.30.92.100',
    defaultCarPrefix: 'C',
    defaultBikePrefix: 'MC',
    defaultImage: '/api/latest?camera_id=cam3&image=true',
    storageKey: 'cpe_parking_slots_cam3'
  }
]

export function getCameraConfig(camId = 'cam1') {
  return SYSTEM_CAMERAS.find((c) => c.id === camId) || SYSTEM_CAMERAS[0]
}

/**
 * Check if slots array is merely the dummy single 100x100 test box from initial development
 */
export function isDummyTestSlot(slots) {
  if (!slots || !Array.isArray(slots) || slots.length === 0) return true
  if (
    slots.length === 1 &&
    slots[0].id === 'A01' &&
    slots[0].points?.[0]?.x === 100 &&
    slots[0].points?.[0]?.y === 100
  ) {
    return true
  }
  return false
}

/**
 * Fetch saved ROI slots from backend Ingestion Server
 */
export async function fetchRoiFromServer(camId = null) {
  const path = camId ? `/api/roi/${camId}` : '/api/roi'

  // 1. Try relative path (Vite reverse proxy)
  try {
    const res = await fetch(path)
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data === 'object') return data
    }
  } catch (err) {
    // Relative fetch failed
  }

  // 2. Fallback to direct port 5005
  try {
    const fallbackBase =
      typeof window !== 'undefined'
        ? `http://${window.location.hostname}:5005`
        : 'http://localhost:5005'
    const res = await fetch(`${fallbackBase}${path}`)
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data === 'object') return data
    }
  } catch (err) {
    console.warn('Could not fetch ROI from server:', err)
  }
  return null
}

/**
 * Convert zone points [{x, y}] to format [[x, y]] for backend / YOLO
 */
export function formatPolygonForServer(points) {
  if (!points || !Array.isArray(points) || points.length === 0) {
    return []
  }
  if (Array.isArray(points[0])) return points
  return points.map((p) => [Math.round(p.x), Math.round(p.y)])
}

/**
 * Convert server polygon [[x, y]] to client points [{x, y}]
 */
export function parsePolygonFromServer(serverPolygon) {
  if (!serverPolygon || !Array.isArray(serverPolygon) || serverPolygon.length === 0) {
    return null
  }
  // Check if it's already an array of {x, y}
  if (typeof serverPolygon[0] === 'object' && !Array.isArray(serverPolygon[0]) && 'x' in serverPolygon[0]) {
    const valid = serverPolygon
      .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y))
    return valid.length >= 3 ? valid : null
  }
  // Check if it's an array of [x, y] tuples: [[x, y], ...]
  if (Array.isArray(serverPolygon[0])) {
    const valid = serverPolygon
      .map((pt) => ({ x: Number(pt[0]), y: Number(pt[1]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y))
    return valid.length >= 3 ? valid : null
  }
  return null
}

export const FRAMESIZE_RESOLUTIONS = {
  13: { width: 1280, height: 720 },
  12: { width: 1024, height: 768 },
  11: { width: 800,  height: 600 },
  10: { width: 640,  height: 480 },
  9:  { width: 480,  height: 320 }
}

/**
 * Standard calibrated default zone templates for each camera (normalized [0, 1])
 */
export const DEFAULT_CAMERA_ZONES = {
  cam1: [
    {
      id: 'zone_cam1_car',
      name: 'โซนรถยนต์',
      type: 'car',
      capacity: 6,
      points_normalized: [
        { x: 0.0281, y: 0.7367 },
        { x: 0.2606, y: 0.8117 },
        { x: 0.9944, y: 0.4125 },
        { x: 0.8994, y: 0.3200 }
      ]
    },
    {
      id: 'zone_cam1_bike',
      name: 'โซนมอเตอร์ไซค์',
      type: 'motorcycle',
      capacity: 9,
      points_normalized: [
        { x: 0.0588, y: 0.6100 },
        { x: 0.1263, y: 0.6667 },
        { x: 0.8194, y: 0.3325 },
        { x: 0.7425, y: 0.3050 }
      ]
    }
  ],
  cam2: [
    {
      id: 'zone_cam2_car',
      name: 'โซนรถยนต์',
      type: 'car',
      capacity: 6,
      points_normalized: [
        { x: 0.2519, y: 0.6217 },
        { x: 0.2244, y: 0.7375 },
        { x: 0.9663, y: 0.9242 },
        { x: 0.9200, y: 0.7575 }
      ]
    },
    {
      id: 'zone_cam2_bike',
      name: 'โซนมอเตอร์ไซค์',
      type: 'motorcycle',
      capacity: 13,
      points_normalized: [
        { x: 0.4413, y: 0.5592 },
        { x: 0.4369, y: 0.6275 },
        { x: 0.9675, y: 0.7308 },
        { x: 0.9538, y: 0.6500 }
      ]
    }
  ],
  cam3: [
    {
      id: 'zone_cam3_bike_1',
      name: 'โซนมอเตอร์ไซค์ 1',
      type: 'motorcycle',
      capacity: 25,
      points_normalized: [
        { x: 0.3738, y: 0.1658 },
        { x: 0.2313, y: 0.9867 },
        { x: 0.4538, y: 0.9825 },
        { x: 0.4900, y: 0.1533 }
      ]
    },
    {
      id: 'zone_cam3_bike_2',
      name: 'โซนมอเตอร์ไซค์ 2',
      type: 'motorcycle',
      capacity: 25,
      points_normalized: [
        { x: 0.5631, y: 0.1600 },
        { x: 0.6025, y: 0.9958 },
        { x: 0.8569, y: 0.9917 },
        { x: 0.6763, y: 0.1625 }
      ]
    }
  ]
}

/**
 * Generate pixel points scaled to target resolution from default templates
 */
export function getDefaultZonesForCamera(camId = 'cam1', targetWidth = 1280, targetHeight = 720) {
  const templates = DEFAULT_CAMERA_ZONES[camId] || DEFAULT_CAMERA_ZONES.cam1
  return templates.map((tmpl) => {
    const pts = tmpl.points_normalized.map((np) => ({
      x: Math.max(0, Math.min(targetWidth, Math.round(np.x * targetWidth))),
      y: Math.max(0, Math.min(targetHeight, Math.round(np.y * targetHeight)))
    }))
    return {
      id: tmpl.id,
      name: tmpl.name,
      type: tmpl.type,
      capacity: tmpl.capacity,
      points: pts,
      points_normalized: tmpl.points_normalized,
      frame_width: targetWidth,
      frame_height: targetHeight
    }
  })
}

/**
 * Infer the base resolution from points if not explicitly specified
 */
export function inferBaseResolution(points) {
  if (!points || !Array.isArray(points) || points.length === 0) {
    return { width: 1600, height: 1200 }
  }
  let maxX = 0
  let maxY = 0
  for (const p of points) {
    const x = Array.isArray(p) ? p[0] : (p?.x || 0)
    const y = Array.isArray(p) ? p[1] : (p?.y || 0)
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (maxX > 1280 || maxY > 768) return { width: 1600, height: 1200 }
  if (maxX > 1024 || maxY > 600) return { width: 1280, height: 720 }
  if (maxX > 800 || maxY > 480) return { width: 1024, height: 768 }
  if (maxX > 480 || maxY > 320) return { width: 800, height: 600 }
  return { width: 1600, height: 1200 }
}

/**
 * Dynamically scale zone polygon points to target image dimensions
 */
export function scaleZones(zones, targetWidth, targetHeight, sourceWidth = null, sourceHeight = null) {
  if (!Array.isArray(zones) || zones.length === 0) return []
  if (!targetWidth || !targetHeight) return zones

  return zones.map((zone) => {
    if (!zone || !Array.isArray(zone.points) || zone.points.length === 0) return zone

    // 1. If normalized points already exist, scale from [0, 1] directly to target
    if (Array.isArray(zone.points_normalized) && zone.points_normalized.length === zone.points.length) {
      const newPoints = zone.points_normalized.map((np) => ({
        x: Math.max(0, Math.min(targetWidth, Math.round(np.x * targetWidth))),
        y: Math.max(0, Math.min(targetHeight, Math.round(np.y * targetHeight)))
      }))
      return {
        ...zone,
        points: newPoints,
        frame_width: targetWidth,
        frame_height: targetHeight
      }
    }

    // 2. Otherwise determine source resolution and compute normalized points
    let sW = sourceWidth || zone.frame_width
    let sH = sourceHeight || zone.frame_height
    if (!sW || !sH) {
      const inferred = inferBaseResolution(zone.points)
      sW = inferred.width
      sH = inferred.height
    }

    // Normalized points based on source resolution
    const newNorm = zone.points.map((p) => ({
      x: +(Math.max(0, Math.min(sW, p.x)) / sW).toFixed(4),
      y: +(Math.max(0, Math.min(sH, p.y)) / sH).toFixed(4)
    }))

    const newPoints = newNorm.map((np) => ({
      x: Math.max(0, Math.min(targetWidth, Math.round(np.x * targetWidth))),
      y: Math.max(0, Math.min(targetHeight, Math.round(np.y * targetHeight)))
    }))

    return {
      ...zone,
      points: newPoints,
      points_normalized: newNorm,
      frame_width: targetWidth,
      frame_height: targetHeight
    }
  })
}

/**
 * Sync drawn ROI zone area polygon(s) to backend Ingestion Server and detection worker
 */
export async function saveRoiToServer(camId, slotsIgnored = [], zonesOrPolygon = null, frameWidth = null, frameHeight = null) {
  let activeZones = []
  if (Array.isArray(zonesOrPolygon)) {
    activeZones = normalizeZones(zonesOrPolygon)
  } else {
    activeZones = getSavedOrInitialZones(camId)
  }

  // Determine active frame resolution
  const activeW = frameWidth || activeZones[0]?.frame_width || 1600
  const activeH = frameHeight || activeZones[0]?.frame_height || 1200

  const defaultCap = (zType) => (zType === 'car' ? 6 : (camId === 'cam1' ? 9 : (camId === 'cam2' ? 13 : 25)))
  const totalCap = activeZones.reduce((sum, z) => sum + (Number(z.capacity) || defaultCap(z.type)), 0)
  const firstZone = activeZones.length > 0 ? activeZones[0].points : null

  const payload = {
    camera_id: camId,
    name: getCameraConfig(camId)?.name || camId,
    capacity: totalCap,
    slots: [],
    frame_width: activeW,
    frame_height: activeH,
    resolution: [activeW, activeH],
    zones: activeZones.map((z) => ({
      id: z.id,
      name: z.name,
      type: z.type,
      capacity: Number(z.capacity) || defaultCap(z.type),
      polygon: formatPolygonForServer(z.points),
      points_normalized: z.points_normalized || z.points.map((p) => ({
        x: +(p.x / activeW).toFixed(4),
        y: +(p.y / activeH).toFixed(4)
      })),
      frame_width: activeW,
      frame_height: activeH
    })),
    polygon: formatPolygonForServer(firstZone)
  }

  // 1. Try relative path
  try {
    const res = await fetch('/api/roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) return true
  } catch (e) {}

  // 2. Fallback to direct port 5005
  try {
    const fallbackBase =
      typeof window !== 'undefined'
        ? `http://${window.location.hostname}:5005`
        : 'http://localhost:5005'
    const res = await fetch(`${fallbackBase}/api/roi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return res.ok
  } catch (err) {
    console.warn('Could not save ROI to server:', err)
    return false
  }
}

/**
 * Save all 3 cameras ROI Zone Polygons to the central server in a single atomic request
 */
export async function saveAllCamerasRoiToServer() {
  const getCameraPayload = (camId) => {
    const zones = getSavedOrInitialZones(camId)
    const defaultCap = (zType) => (zType === 'car' ? 6 : (camId === 'cam1' ? 9 : (camId === 'cam2' ? 13 : 25)))
    const totalCap = zones.reduce((sum, z) => sum + (Number(z.capacity) || defaultCap(z.type)), 0)
    const activeW = zones[0]?.frame_width || 1600
    const activeH = zones[0]?.frame_height || 1200
    return {
      camera_id: camId,
      name: getCameraConfig(camId)?.name || camId,
      capacity: totalCap,
      slots: [],
      frame_width: activeW,
      frame_height: activeH,
      resolution: [activeW, activeH],
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        type: z.type,
        capacity: Number(z.capacity) || defaultCap(z.type),
        polygon: formatPolygonForServer(z.points),
        points_normalized: z.points_normalized || z.points.map((p) => ({
          x: +(p.x / activeW).toFixed(4),
          y: +(p.y / activeH).toFixed(4)
        })),
        frame_width: activeW,
        frame_height: activeH
      })),
      polygon: formatPolygonForServer(zones[0]?.points || null)
    }
  }

  const payload = {
    cam1: getCameraPayload('cam1'),
    cam2: getCameraPayload('cam2'),
    cam3: getCameraPayload('cam3')
  }

  try {
    const res = await fetch('/api/roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) return true
  } catch (e) {}

  try {
    const fallbackBase =
      typeof window !== 'undefined'
        ? `http://${window.location.hostname}:5005`
        : 'http://localhost:5005'
    const res = await fetch(`${fallbackBase}/api/roi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return res.ok
  } catch (err) {
    console.warn('Could not save all ROI to server:', err)
  }
  return false
}

/**
 * Synchronize slots and multi-zones for all cameras from the central server.
/**
 * Fetch real-time AI model parking detection metrics from FastAPI PostgreSQL/Redis backend
 */
export async function fetchLiveParkStatus() {
  try {
    const apiBase = getIngestionApiBase()
    const res = await fetch(`${apiBase}/api/v1/parking/status`)
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    return []
  }
}

/**
 * Synchronize all cameras' slots & zone metadata directly from central Postgres server.
 * Ensures all connected computers and browser tabs see the exact same ROI.
 */
export async function syncAllSlotsFromServer() {
  try {
    const apiBase = getIngestionApiBase()
    const [roiData, statusData] = await Promise.all([
      fetchRoiFromServer(),
      fetch(`${apiBase}/api/v1/parking/status`).then(r => r.ok ? r.json() : []).catch(() => [])
    ])
    if (!roiData || typeof roiData !== 'object') return null

    const statusMap = {}
    if (Array.isArray(statusData)) {
      statusData.forEach((item) => {
        if (item && item.camera_id) {
          statusMap[item.camera_id] = item
        }
      })
    }

    let anyUpdated = false
    const results = {}

    for (const cam of SYSTEM_CAMERAS) {
      const camId = cam.id
      const camData = roiData[camId] || roiData[cam.location]
      const serverSlots = camData?.slots
      const rawServerZones = camData?.zones || camData?.polygon

      if (Array.isArray(serverSlots) && serverSlots.length > 0) {
        const camLiveStatus = statusMap[camId]
        const liveSlotDetails = Array.isArray(camLiveStatus?.slots_detail) ? camLiveStatus.slots_detail : []
        const liveSlotMap = {}
        liveSlotDetails.forEach((s) => {
          if (s && s.id) liveSlotMap[s.id] = s
        })

        const mergedSlots = serverSlots.map((slot) => {
          const live = liveSlotMap[slot.id]
          if (live) {
            return {
              ...slot,
              occupied: Boolean(live.occupied),
              vehicle: live.vehicle || null,
              vehicle_name: live.vehicle_name || (live.occupied ? 'ไม่ว่าง' : 'ว่างพร้อมจอด'),
              conf: live.conf !== undefined ? live.conf : null
            }
          }
          return slot
        })

        results[camId] = mergedSlots
        saveSlotsToStorage(mergedSlots, camId, false)
        anyUpdated = true
      } else {
        results[camId] = []
        saveSlotsToStorage([], camId, false)
      }

      // Sync Multi-Zone Area Masks & Polygons safely
      if (rawServerZones) {
        const normalized = normalizeZones(rawServerZones)
        if (normalized.length > 0) {
          saveZonesToStorage(normalized, camId, false)
        }
      }
    }

    if (anyUpdated && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cpe-slots-updated', { detail: results }))
    }

    return results
  } catch (err) {
    console.warn('Failed to sync all slots from server:', err)
    return null
  }
}

/**
 * Check if polygon is merely a full-frame dummy (1600x1200 whole camera)
 */
export function isDummyTestZone(polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return true
  const pts = parsePolygonFromServer(polygon)
  if (pts && pts.length === 4) {
    const minX = Math.min(...pts.map((p) => p.x))
    const maxX = Math.max(...pts.map((p) => p.x))
    const minY = Math.min(...pts.map((p) => p.y))
    const maxY = Math.max(...pts.map((p) => p.y))
    if (minX <= 20 && maxX >= 1550 && minY <= 20 && maxY >= 1150) {
      return true
    }
  }
  return false
}

export function getDefaultZoneForCamera(camId = 'cam1') {
  return []
}

/**
 * Normalize zones input from array of zone objects or legacy single polygon
 */
export function normalizeZones(rawZones) {
  if (!rawZones) return []
  if (Array.isArray(rawZones)) {
    // Check if it's already an array of zone objects: [{ id, name, type, points/polygon }, ...]
    if (
      rawZones.length > 0 &&
      typeof rawZones[0] === 'object' &&
      !Array.isArray(rawZones[0]) &&
      !('x' in rawZones[0])
    ) {
      const validZones = rawZones
        .map((z, idx) => {
          if (!z || typeof z !== 'object') return null
          const rawPts = z.points || z.polygon
          const parsedPts = parsePolygonFromServer(rawPts)
          if (!parsedPts || parsedPts.length < 3) return null
          const frameW = z.frame_width || null
          const frameH = z.frame_height || null
          let rawNorm = Array.isArray(z.points_normalized) && z.points_normalized.length === parsedPts.length ? z.points_normalized : null
          if (!rawNorm && parsedPts && parsedPts.length >= 3) {
            const baseRes = frameW && frameH ? { width: frameW, height: frameH } : inferBaseResolution(parsedPts)
            rawNorm = parsedPts.map((p) => ({
              x: +(Math.max(0, Math.min(baseRes.width, p.x)) / baseRes.width).toFixed(4),
              y: +(Math.max(0, Math.min(baseRes.height, p.y)) / baseRes.height).toFixed(4)
            }))
          }
          const isBike = z.type === 'motorcycle' || z.type === 'bike'
          return {
            id: z.id || `zone_${idx + 1}`,
            name:
              z.name ||
              (isBike
                ? `โซนมอเตอร์ไซค์ ${idx + 1}`
                : `โซนรถยนต์ ${idx + 1}`),
            type: isBike ? 'motorcycle' : 'car',
            capacity: Number(z.capacity) || (isBike ? 9 : 6),
            points: parsedPts,
            points_normalized: rawNorm,
            frame_width: frameW,
            frame_height: frameH
          }
        })
        .filter(Boolean)
      if (validZones.length > 0) return validZones
    }

    // Check if it's a single polygon array: [{x, y}, ...] or [[x, y], ...]
    const singlePts = parsePolygonFromServer(rawZones)
    if (singlePts && singlePts.length >= 3 && !isDummyTestZone(singlePts)) {
      const baseRes = inferBaseResolution(singlePts)
      const normPts = singlePts.map((p) => ({
        x: +(Math.max(0, Math.min(baseRes.width, p.x)) / baseRes.width).toFixed(4),
        y: +(Math.max(0, Math.min(baseRes.height, p.y)) / baseRes.height).toFixed(4)
      }))
      return [
        {
          id: 'zone_1',
          name: 'โซนพื้นที่รวม 1',
          type: 'car',
          capacity: 6,
          points: singlePts,
          points_normalized: normPts,
          frame_width: baseRes.width,
          frame_height: baseRes.height
        }
      ]
    }
  }
  return []
}

export function getSavedOrInitialZones(camId = 'cam1', targetWidth = 1280, targetHeight = 720) {
  if (typeof window === 'undefined') return getDefaultZonesForCamera(camId, targetWidth, targetHeight)
  const storageKey = `cpe_parking_zones_${camId}`
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return [] // Explicitly empty/cleared by user! Do not resurrect defaults!
        }
        const normalized = normalizeZones(parsed)
        if (normalized.length > 0) {
          return scaleZones(normalized, targetWidth, targetHeight)
        }
        return []
      }
    }
  } catch (e) {
    console.warn(`Error reading saved zones for ${camId}:`, e)
  }
  return getDefaultZonesForCamera(camId, targetWidth, targetHeight)
}

export function saveZonesToStorage(zones, camId = 'cam1', broadcast = true) {
  if (typeof window === 'undefined') return
  const storageKey = `cpe_parking_zones_${camId}`
  try {
    const safeZones = Array.isArray(zones)
      ? zones.filter((z) => z && Array.isArray(z.points) && z.points.length >= 3)
      : []
    const finalized = safeZones.map((z) => {
      const fW = z.frame_width || 1280
      const fH = z.frame_height || 720
      const norm = Array.isArray(z.points_normalized) && z.points_normalized.length === z.points.length
        ? z.points_normalized
        : z.points.map((p) => ({
            x: +(Math.max(0, Math.min(fW, p.x)) / fW).toFixed(4),
            y: +(Math.max(0, Math.min(fH, p.y)) / fH).toFixed(4)
          }))
      return {
        ...z,
        points_normalized: norm,
        frame_width: fW,
        frame_height: fH
      }
    })
    // Explicitly persist empty array [] so it is not treated as missing
    localStorage.setItem(storageKey, JSON.stringify(finalized))
    if (finalized.length > 0) {
      localStorage.setItem(`cpe_parking_zone_${camId}`, JSON.stringify(finalized[0].points))
    } else {
      localStorage.setItem(`cpe_parking_zone_${camId}`, JSON.stringify([]))
    }
    if (broadcast) {
      window.dispatchEvent(
        new CustomEvent('cpe-zones-updated', {
          detail: { cameraId: camId, zones: finalized }
        })
      )
    }
  } catch (e) {
    console.warn(`Failed to save zones for ${camId}:`, e)
  }
}

export function getSavedOrInitialZone(camId = 'cam1') {
  const zones = getSavedOrInitialZones(camId)
  return zones.length > 0 ? zones[0].points : null
}

export function saveZoneToStorage(zonePoints, camId = 'cam1', broadcast = true) {
  if (zonePoints && Array.isArray(zonePoints) && zonePoints.length >= 3) {
    saveZonesToStorage(
      [{ id: 'zone_1', name: 'โซนพื้นที่รวม 1', type: 'car', points: zonePoints }],
      camId,
      broadcast
    )
  }
}

export function resetCameraZone(camId = 'cam1') {
  saveZonesToStorage([], camId)
  return []
}

export function getDefaultSlotsForCamera(camId = 'cam1') {
  if (camId === 'cam2') return DEFAULT_CAM2_SLOTS
  if (camId === 'cam3') return DEFAULT_CAM3_SLOTS
  return DEFAULT_CAM1_SLOTS
}

export function getSavedOrInitialSlots(camId = 'cam1') {
  const fallback = getDefaultSlotsForCamera(camId)
  if (typeof window === 'undefined') return fallback
  const storageKey = `cpe_parking_slots_${camId}`
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn(`Error reading saved slots for ${camId}:`, e)
  }
  return fallback
}

export function saveSlotsToStorage(slots, camId = 'cam1', broadcast = true) {
  if (typeof window === 'undefined') return
  const storageKey = `cpe_parking_slots_${camId}`
  try {
    localStorage.setItem(storageKey, JSON.stringify(slots))
    if (broadcast) {
      window.dispatchEvent(
        new CustomEvent('cpe-slots-updated', {
          detail: { cameraId: camId, slots }
        })
      )
    }
  } catch (e) {
    console.warn(`Failed to save slots for ${camId}:`, e)
  }
}

export function resetCameraSlots(camId = 'cam1') {
  const defaults = getDefaultSlotsForCamera(camId)
  saveSlotsToStorage(defaults, camId)
  saveRoiToServer(camId, defaults)
  return defaults
}

export function getCameraImage(camId = 'cam1') {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(`cpe_camera_image_${camId}`)
  } catch (e) {
    return null
  }
}

export function saveCameraImage(camId, imageUrlOrDataUrl) {
  if (typeof window === 'undefined') return
  try {
    const key = `cpe_camera_image_${camId}`
    if (imageUrlOrDataUrl) {
      localStorage.setItem(key, imageUrlOrDataUrl)
    } else {
      localStorage.removeItem(key)
    }
    window.dispatchEvent(
      new CustomEvent('cpe-camera-image-updated', {
        detail: { cameraId: camId, imageUrl: imageUrlOrDataUrl }
      })
    )
  } catch (e) {
    console.warn(`Failed to save camera image for ${camId}:`, e)
  }
}

export function calculateSlotCounts(slots) {
  const safeSlots = Array.isArray(slots) ? slots : []
  const carSlots = safeSlots.filter((s) => s.type !== 'motorcycle' && s.type !== 'bike')
  const bikeSlots = safeSlots.filter((s) => s.type === 'motorcycle' || s.type === 'bike')

  const totalCar = carSlots.length
  const freeCar = carSlots.filter((s) => !s.occupied).length
  const occupiedCar = totalCar - freeCar

  const totalBike = bikeSlots.length
  const freeBike = bikeSlots.filter((s) => !s.occupied).length
  const occupiedBike = totalBike - freeBike

  return {
    car: { free: freeCar, total: totalCar, occupied: occupiedCar },
    bike: { free: freeBike, total: totalBike, occupied: occupiedBike }
  }
}

