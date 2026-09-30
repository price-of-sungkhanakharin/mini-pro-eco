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

/**
 * Fetch and normalize all 30 metadata records from public/dump_data/metadata.json
 */
export async function loadDumpMetadata() {
  try {
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

      // Extract human-readable local time from filename or timestamp
      // e.g. "2026-09-22_18-00-01_562.jpg" -> "2026-09-22 18:00:01"
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
export const DEFAULT_CAM1_SLOTS = [
  {
    id: 'A01',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Sedan ดำ (กข-1234)',
    points: [
      { x: 605, y: 440 },
      { x: 830, y: 445 },
      { x: 820, y: 550 },
      { x: 595, y: 545 }
    ],
    bbox: { x: 595, y: 440, width: 235, height: 110 }
  },
  {
    id: 'A02',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'SUV ดำ (ขข-5544)',
    points: [
      { x: 445, y: 535 },
      { x: 740, y: 540 },
      { x: 710, y: 765 },
      { x: 420, y: 755 }
    ],
    bbox: { x: 420, y: 535, width: 320, height: 230 }
  },
  {
    id: 'A03',
    type: 'car',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 780, y: 460 },
      { x: 1000, y: 465 },
      { x: 975, y: 630 },
      { x: 755, y: 620 }
    ],
    bbox: { x: 755, y: 460, width: 245, height: 170 }
  },
  {
    id: 'A04',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Sedan ขาว (ฮฮ-9988)',
    points: [
      { x: 140, y: 575 },
      { x: 390, y: 580 },
      { x: 375, y: 720 },
      { x: 125, y: 710 }
    ],
    bbox: { x: 125, y: 575, width: 265, height: 145 }
  },
  {
    id: 'A05',
    type: 'car',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 10, y: 700 },
      { x: 370, y: 710 },
      { x: 345, y: 975 },
      { x: 10, y: 960 }
    ],
    bbox: { x: 10, y: 700, width: 360, height: 275 }
  },
  {
    id: 'M01',
    type: 'motorcycle',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Honda Wave แดง',
    points: [
      { x: 1060, y: 470 },
      { x: 1140, y: 472 },
      { x: 1130, y: 550 },
      { x: 1050, y: 548 }
    ],
    bbox: { x: 1050, y: 470, width: 90, height: 80 }
  },
  {
    id: 'M02',
    type: 'motorcycle',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 1150, y: 472 },
      { x: 1230, y: 475 },
      { x: 1220, y: 552 },
      { x: 1140, y: 550 }
    ],
    bbox: { x: 1140, y: 472, width: 90, height: 80 }
  }
]

export const SLOTS_STORAGE_KEY = 'cpe_parking_slots_cam1'

export const DEFAULT_CAM2_SLOTS = [
  {
    id: 'B01',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Sedan ดำ (1กค-2020)',
    points: [
      { x: 180, y: 520 },
      { x: 380, y: 520 },
      { x: 360, y: 720 },
      { x: 150, y: 720 }
    ],
    bbox: { x: 150, y: 520, width: 230, height: 200 }
  },
  {
    id: 'B02',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Sedan ขาว (2ขพ-4433)',
    points: [
      { x: 410, y: 520 },
      { x: 610, y: 520 },
      { x: 590, y: 720 },
      { x: 390, y: 720 }
    ],
    bbox: { x: 390, y: 520, width: 220, height: 200 }
  },
  {
    id: 'B03',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'SUV บรอนซ์ (5กษ-8811)',
    points: [
      { x: 640, y: 520 },
      { x: 840, y: 520 },
      { x: 820, y: 720 },
      { x: 620, y: 720 }
    ],
    bbox: { x: 620, y: 520, width: 220, height: 200 }
  },
  {
    id: 'B04',
    type: 'car',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 870, y: 520 },
      { x: 1070, y: 520 },
      { x: 1050, y: 720 },
      { x: 850, y: 720 }
    ],
    bbox: { x: 850, y: 520, width: 220, height: 200 }
  },
  {
    id: 'B05',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'กระบะ ขาว (3ฒณ-9090)',
    points: [
      { x: 1100, y: 520 },
      { x: 1300, y: 520 },
      { x: 1280, y: 720 },
      { x: 1080, y: 720 }
    ],
    bbox: { x: 1080, y: 520, width: 220, height: 200 }
  },
  {
    id: 'B06',
    type: 'car',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 1330, y: 520 },
      { x: 1530, y: 520 },
      { x: 1510, y: 720 },
      { x: 1310, y: 720 }
    ],
    bbox: { x: 1310, y: 520, width: 220, height: 200 }
  },
  {
    id: 'MB01',
    type: 'motorcycle',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 180, y: 780 },
      { x: 280, y: 780 },
      { x: 270, y: 880 },
      { x: 170, y: 880 }
    ],
    bbox: { x: 170, y: 780, width: 110, height: 100 }
  },
  {
    id: 'MB02',
    type: 'motorcycle',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Yamaha Fazzio',
    points: [
      { x: 300, y: 780 },
      { x: 400, y: 780 },
      { x: 390, y: 880 },
      { x: 290, y: 880 }
    ],
    bbox: { x: 290, y: 780, width: 110, height: 100 }
  }
]

export const DEFAULT_CAM3_SLOTS = [
  {
    id: 'C01',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Sedan น้ำเงิน (อาจารย์ 1)',
    points: [
      { x: 250, y: 480 },
      { x: 480, y: 480 },
      { x: 460, y: 700 },
      { x: 230, y: 700 }
    ],
    bbox: { x: 230, y: 480, width: 250, height: 220 }
  },
  {
    id: 'C02',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'SUV ขาว (อาจารย์ 2)',
    points: [
      { x: 520, y: 480 },
      { x: 750, y: 480 },
      { x: 730, y: 700 },
      { x: 500, y: 700 }
    ],
    bbox: { x: 500, y: 480, width: 250, height: 220 }
  },
  {
    id: 'C03',
    type: 'car',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Sedan เทา (เจ้าหน้าที่)',
    points: [
      { x: 790, y: 480 },
      { x: 1020, y: 480 },
      { x: 1000, y: 700 },
      { x: 770, y: 700 }
    ],
    bbox: { x: 770, y: 480, width: 250, height: 220 }
  },
  {
    id: 'C04',
    type: 'car',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 1060, y: 480 },
      { x: 1290, y: 480 },
      { x: 1270, y: 700 },
      { x: 1040, y: 700 }
    ],
    bbox: { x: 1040, y: 480, width: 250, height: 220 }
  },
  {
    id: 'C05',
    type: 'car',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 1330, y: 480 },
      { x: 1560, y: 480 },
      { x: 1540, y: 700 },
      { x: 1310, y: 700 }
    ],
    bbox: { x: 1310, y: 480, width: 250, height: 220 }
  },
  {
    id: 'MC01',
    type: 'motorcycle',
    shape: 'polygon',
    occupied: true,
    vehicle_name: 'Honda Click ดำ',
    points: [
      { x: 100, y: 500 },
      { x: 200, y: 500 },
      { x: 190, y: 620 },
      { x: 90, y: 620 }
    ],
    bbox: { x: 90, y: 500, width: 110, height: 120 }
  },
  {
    id: 'MC02',
    type: 'motorcycle',
    shape: 'polygon',
    occupied: false,
    vehicle_name: 'ว่างพร้อมจอด',
    points: [
      { x: 100, y: 650 },
      { x: 200, y: 650 },
      { x: 190, y: 770 },
      { x: 90, y: 770 }
    ],
    bbox: { x: 90, y: 650, width: 110, height: 120 }
  }
]

export const SYSTEM_CAMERAS = [
  {
    id: 'cam1',
    code: 'CAM-01',
    name: 'ลานหน้าภาควิชาคอมพิวเตอร์',
    location: 'front_dept',
    zone: 'zone_a',
    zoneName: 'Zone A - Main Front Gate',
    device: 'Edge Node (ESP32-CAM / Cam1)',
    defaultCarPrefix: 'A',
    defaultBikePrefix: 'M',
    defaultImage: '/dump_data/images/2026-09-22_18-00-01_562.jpg',
    storageKey: 'cpe_parking_slots_cam1'
  },
  {
    id: 'cam2',
    code: 'CAM-02',
    name: 'ลานจอดรถในร่มข้างอาคาร',
    location: 'covered_lot',
    zone: 'zone_b',
    zoneName: 'Zone B - Covered Lot',
    device: 'Smartphone #2 (iPhone 13)',
    defaultCarPrefix: 'B',
    defaultBikePrefix: 'MB',
    defaultImage: '/dump_data/images/2026-09-22_18-00-42_303.jpg',
    storageKey: 'cpe_parking_slots_cam2'
  },
  {
    id: 'cam3',
    code: 'CAM-03',
    name: 'ลานจอดด้านหลังภาควิชา',
    location: 'rear_faculty',
    zone: 'zone_c',
    zoneName: 'Zone C - Rear Faculty Lot',
    device: 'Smartphone #3 (iPhone 13)',
    defaultCarPrefix: 'C',
    defaultBikePrefix: 'MC',
    defaultImage: '/dump_data/images/2026-09-22_18-01-33_173.jpg',
    storageKey: 'cpe_parking_slots_cam3'
  }
]

export function getCameraConfig(camId = 'cam1') {
  return SYSTEM_CAMERAS.find((c) => c.id === camId) || SYSTEM_CAMERAS[0]
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

export function saveSlotsToStorage(slots, camId = 'cam1') {
  if (typeof window === 'undefined') return
  const storageKey = `cpe_parking_slots_${camId}`
  try {
    localStorage.setItem(storageKey, JSON.stringify(slots))
    window.dispatchEvent(
      new CustomEvent('cpe-slots-updated', {
        detail: { cameraId: camId, slots }
      })
    )
  } catch (e) {
    console.warn(`Failed to save slots for ${camId}:`, e)
  }
}

export function resetCameraSlots(camId = 'cam1') {
  const defaults = getDefaultSlotsForCamera(camId)
  saveSlotsToStorage(defaults, camId)
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

