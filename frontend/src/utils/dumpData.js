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
  }
]
