import React, { useState, useEffect } from 'react'
import {
  Camera,
  Sliders,
  RefreshCw,
  Moon,
  Sun,
  Zap,
  RotateCw,
  Image as ImageIcon,
  Wifi,
  Cpu,
  Thermometer,
  CheckCircle2,
  AlertCircle,
  Save,
  Undo2,
  Clock,
  HardDrive,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Brain,
} from 'lucide-react'
import { PillTag, PillButton } from '../../components/ui/FigmaCards'

const FRAMESIZE_OPTIONS = [
  { value: 13, name: 'HD', res: '1280x720', desc: 'สัดส่วน Widescreen 16:9 คมชัดสูง (แนะนำสำหรับระบบจอดรถ)' },
  { value: 12, name: 'XGA', res: '1024x768', desc: 'สัดส่วน 4:3 คมชัดสูง' },
  { value: 11, name: 'SVGA', res: '800x600', desc: 'สัดส่วน 4:3 ความละเอียดปานกลาง' },
  { value: 10, name: 'VGA', res: '640x480', desc: 'สัดส่วน 4:3 ความเร็วสูง' },
  { value: 9, name: 'HVGA', res: '480x320', desc: 'สัดส่วน 3:2 ประหยัดแบนด์วิดท์สูงสุด' }
]

const DAY_SLEEP_PRESETS = [
  { sec: 10, label: '10 วินาที (High Frequency)' },
  { sec: 15, label: '15 วินาที' },
  { sec: 20, label: '20 วินาที (ค่าแนะนำ V4)' },
  { sec: 30, label: '30 วินาที' },
  { sec: 60, label: '60 วินาที (ประหยัดพลังงาน)' }
]

const NIGHT_SLEEP_PRESETS = [
  { sec: 300, label: '5 นาที (300s)' },
  { sec: 900, label: '15 นาที (900s)' },
  { sec: 1800, label: '30 นาที (1800s - ค่าแนะนำ)' },
  { sec: 3600, label: '1 ชั่วโมง (3600s)' }
]

const CAMERAS_META = [
  {
    id: 'cam1',
    locKey: 'front_dept_1',
    name: 'หน้าภาค 1 (รถยนต์)',
    target: 'Car • 10 Slots',
    ipDefault: '172.31.207.32'
  },
  {
    id: 'cam2',
    locKey: 'front_dept_2',
    name: 'หน้าภาค 2 (รถยนต์)',
    target: 'Car • 10 Slots',
    ipDefault: '172.30.90.24'
  },
  {
    id: 'cam3',
    locKey: 'side_dept',
    name: 'ข้างภาคคอม (มอเตอร์ไซค์)',
    target: 'Motorcycle • 20 Slots',
    ipDefault: '172.30.95.203'
  }
]

export default function CameraControlPage({
  onNavigate,
  embedded = false,
  initialCameraId = 'cam1'
}) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const [selectedCam, setSelectedCam] = useState(initialCameraId || 'cam1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [imgTimestamp, setImgTimestamp] = useState(Date.now())
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (initialCameraId) {
      setSelectedCam(initialCameraId)
    }
  }, [initialCameraId])

  // Telemetry map by camera_id
  const [telemetryData, setTelemetryData] = useState({})

  // Settings map by location / camera_id
  const [settingsMap, setSettingsMap] = useState({
    cam1: {
      framesize: 9,
      quality: 10,
      deep_sleep_sec: 20,
      deep_sleep_sec_day: 20,
      deep_sleep_sec_night: 1800,
      day_sleep_mode: 'model',
      rotation: 180,
      brightness: 0.82,
      contrast: 1.15
    },
    cam2: {
      framesize: 13,
      quality: 10,
      deep_sleep_sec: 20,
      deep_sleep_sec_day: 20,
      deep_sleep_sec_night: 1800,
      day_sleep_mode: 'model',
      rotation: 180,
      brightness: 0.82,
      contrast: 1.15
    },
    cam3: {
      framesize: 13,
      quality: 10,
      deep_sleep_sec: 20,
      deep_sleep_sec_day: 20,
      deep_sleep_sec_night: 1800,
      day_sleep_mode: 'model',
      rotation: 180,
      brightness: 0.80,
      contrast: 1.15
    }
  })

  // Fetch settings & telemetry on load and periodically
  const fetchAllData = async () => {
    try {
      // 1. Fetch settings from Ingestion Server (:5005)
      const resSettings = await fetch(`http://${host}:5005/api/settings`)
      if (resSettings.ok) {
        const rawSettings = await resSettings.json()
        const parsed = {}
        Object.entries(rawSettings).forEach(([locKey, val]) => {
          const cid = val.camera_id || (locKey === 'front_dept_1' ? 'cam1' : locKey === 'front_dept_2' ? 'cam2' : 'cam3')
          parsed[cid] = {
            framesize: Number(val.framesize ?? 9),
            quality: Number(val.quality ?? 10),
            deep_sleep_sec: Number(val.deep_sleep_sec ?? 20),
            deep_sleep_sec_day: Number(val.deep_sleep_sec_day ?? val.deep_sleep_sec ?? 20),
            deep_sleep_sec_night: Number(val.deep_sleep_sec_night ?? 1800),
            day_sleep_mode: String(val.day_sleep_mode || 'model').toLowerCase(),
            rotation: Number(val.rotation ?? 0),
            brightness: Number(val.brightness ?? 1.0),
            contrast: Number(val.contrast ?? 1.0)
          }
        })
        setSettingsMap((prev) => ({ ...prev, ...parsed }))
      }

      // 2. Fetch latest telemetry for all cameras
      const telMap = {}
      await Promise.all(
        CAMERAS_META.map(async (c) => {
          try {
            const r = await fetch(`http://${host}:5005/api/telemetry?camera_id=${c.id}`)
            if (r.ok) {
              const data = await r.json()
              telMap[c.id] = data
            }
          } catch (_) {}
        })
      )
      setTelemetryData(telMap)
    } catch (err) {
      console.warn('Could not fetch camera settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
    const timer = setInterval(() => {
      fetchAllData()
      setImgTimestamp(Date.now())
    }, 12000)
    return () => clearInterval(timer)
  }, [host])

  const currentSettings = settingsMap[selectedCam] || {
    framesize: 9,
    quality: 10,
    deep_sleep_sec: 20,
    deep_sleep_sec_day: 20,
    deep_sleep_sec_night: 1800,
    day_sleep_mode: 'model',
    rotation: 180,
    brightness: 0.82,
    contrast: 1.15
  }

  const currentTel = telemetryData[selectedCam] || {}
  const telMeta = currentTel.telemetry || {}
  const clientIp = currentTel.client_ip || CAMERAS_META.find((c) => c.id === selectedCam)?.ipDefault

  const handleFieldChange = (field, value) => {
    setSettingsMap((prev) => ({
      ...prev,
      [selectedCam]: {
        ...prev[selectedCam],
        [field]: value
      }
    }))
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setErrorMsg(null)
    try {
      const activeMeta = CAMERAS_META.find((c) => c.id === selectedCam)
      const locKey = activeMeta?.locKey || 'front_dept_1'
      const cfg = settingsMap[selectedCam]

      const payload = {
        location: locKey,
        camera_id: selectedCam,
        framesize: Number(cfg.framesize),
        quality: Number(cfg.quality),
        deep_sleep_sec: Number(cfg.deep_sleep_sec_day || cfg.deep_sleep_sec || 20),
        deep_sleep_sec_day: Number(cfg.deep_sleep_sec_day || 20),
        deep_sleep_sec_night: Number(cfg.deep_sleep_sec_night || 1800),
        day_sleep_mode: cfg.day_sleep_mode || 'model',
        rotation: Number(cfg.rotation),
        brightness: Number(cfg.brightness),
        contrast: Number(cfg.contrast)
      }

      // 1. Post to Ingestion Server (:5005)
      await fetch(`http://${host}:5005/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // 2. Post to FastAPI Backend (:8000) for dual sync
      try {
        await fetch(`http://${host}:8000/api/v1/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } catch (_) {}

      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 4500)
      setImgTimestamp(Date.now())
    } catch (err) {
      console.error('Failed to save settings:', err)
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกค่า: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (selectedCam === 'cam1') {
      handleFieldChange('framesize', 9)
      handleFieldChange('quality', 10)
      handleFieldChange('deep_sleep_sec_day', 20)
      handleFieldChange('deep_sleep_sec_night', 1800)
      handleFieldChange('rotation', 180)
      handleFieldChange('brightness', 0.82)
      handleFieldChange('contrast', 1.15)
    } else {
      handleFieldChange('framesize', 13)
      handleFieldChange('quality', 10)
      handleFieldChange('deep_sleep_sec_day', 20)
      handleFieldChange('deep_sleep_sec_night', 1800)
      handleFieldChange('rotation', 180)
    }
  }

  const mainContent = (
    <>

      {/* Notification Banner */}
      {savedSuccess && (
        <div className="w-full p-4 bg-[#E7F4D8] border border-[#BBF7D0] rounded-[20px] text-[#36612D] flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#36612D] shrink-0" />
            <div>
              <p className="text-xs font-bold m-0">บันทึกการตั้งค่าสำเร็จ (2-Way Control Updated)!</p>
              <p className="text-[11px] opacity-80 m-0 mt-0.5">
                คำสั่ง Framesize {currentSettings.framesize} และ Deep Sleep {currentSettings.deep_sleep_sec_day}s จะถูกส่งตอบกลับในรอบการตื่นถัดไปของกล้อง {selectedCam.toUpperCase()} ทันที
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-white/60 px-2.5 py-1 rounded-full border border-[#BBF7D0]">
            SYNC PENDING
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="w-full p-4 bg-red-50 border border-red-200 rounded-[20px] text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 3. Camera Selector Cards (3 Edge Nodes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full">
        {CAMERAS_META.map((cam) => {
          const isSelected = selectedCam === cam.id
          const tel = telemetryData[cam.id]?.telemetry || {}
          const isLive = Boolean(telemetryData[cam.id]?.timestamp)
          const chipTemp = tel.chip_temp_c ? `${tel.chip_temp_c.toFixed(1)}°C` : 'N/A'
          const wifiRssi = tel.wifi_rssi_dbm ? `${tel.wifi_rssi_dbm} dBm` : 'N/A'
          const freeHeap = tel.free_heap ? `${Math.round(tel.free_heap / 1024)} KB` : 'N/A'

          return (
            <button
              key={cam.id}
              type="button"
              onClick={() => setSelectedCam(cam.id)}
              className={`p-4 md:p-5 rounded-[22px] border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-[#FFFDF7] border-[#284E1A] shadow-sm ring-2 ring-[#284E1A]/10'
                  : 'bg-[#FAF8EF] border-[#DEDED2] hover:border-[#B8B8A8]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-bold text-sm text-[#30312F] uppercase">{cam.id}</span>
                  <span className="text-xs text-[#85847E]">({cam.name})</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#E7F4D8] text-[#284E1A] font-bold' : 'bg-[#EFEFEA] text-[#85847E]'}`}>
                  {isSelected ? 'SELECTED' : 'SELECT'}
                </span>
              </div>

              <div className="text-xs text-[#686962] font-medium mb-3">
                {cam.target}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#DEDED2] text-[11px]">
                <div>
                  <span className="text-[#85847E] block text-[10px]">Temp</span>
                  <span className="font-mono font-bold text-[#30312F]">{chipTemp}</span>
                </div>
                <div>
                  <span className="text-[#85847E] block text-[10px]">Wi-Fi RSSI</span>
                  <span className="font-mono font-bold text-[#30312F]">{wifiRssi}</span>
                </div>
                <div>
                  <span className="text-[#85847E] block text-[10px]">RAM Heap</span>
                  <span className="font-mono font-bold text-[#30312F]">{freeHeap}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 4. Main Two-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: Live Snapshot & Telemetry Diagnostics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Snapshot Card */}
          <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#DEDED2]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#284E1A]" />
                <h3 className="font-bold text-sm text-[#30312F] m-0">Live Camera Snapshot</h3>
              </div>
              <button
                type="button"
                onClick={() => setImgTimestamp(Date.now())}
                className="text-xs text-[#284E1A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>รีเฟรชภาพ</span>
              </button>
            </div>

            {/* Snapshot Image Container */}
            <div className="relative aspect-[4/3] bg-black/5 rounded-[16px] overflow-hidden border border-[#DEDED2] flex items-center justify-center">
              <img
                src={`http://${host}:5005/api/latest?camera_id=${selectedCam}&image=true&t=${imgTimestamp}`}
                alt={`Live Frame ${selectedCam}`}
                className="w-full h-full object-cover transition-opacity duration-300"
                onLoad={(e) => {
                  if (e.target.naturalWidth && e.target.naturalHeight) {
                    setImgDims({ width: e.target.naturalWidth, height: e.target.naturalHeight })
                  }
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div
                style={{ display: 'none' }}
                className="absolute inset-0 flex-col items-center justify-center gap-2 text-[#85847E] p-4 text-center"
              >
                <ImageIcon className="w-8 h-8 opacity-40" />
                <p className="text-xs m-0">กำลังรอภาพแรกจากกล้อง {selectedCam.toUpperCase()}...</p>
              </div>

              {/* Live Overlay Badge with Real Dimensions */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{selectedCam.toUpperCase()} LIVE SNAPSHOT</span>
                {imgDims.width > 0 && (
                  <span className="bg-emerald-500/80 text-white font-bold px-1.5 py-0.2 rounded text-[9px]">
                    {imgDims.width}×{imgDims.height} px
                  </span>
                )}
              </div>
            </div>

            {/* Snapshot Info Footer */}
            <div className="mt-3 pt-3 border-t border-[#DEDED2] grid grid-cols-2 gap-2 text-xs text-[#85847E]">
              <div>
                IP Node: <span className="font-mono text-[#30312F] font-semibold">{clientIp}</span>
              </div>
              <div className="text-right">
                ความละเอียดจริง: <span className="font-mono font-bold text-[#284E1A]">{imgDims.width > 0 ? `${imgDims.width}×${imgDims.height} px` : '1280×720 px'}</span>
              </div>
              <div>
                Framesize คอนฟิก: <span className="font-mono font-semibold text-[#30312F]">{currentSettings.framesize}</span>
              </div>
              <div className="text-right">
                ขนาดไฟล์: <span className="font-mono font-semibold text-[#30312F]">{currentTel.file_size_bytes ? `${(currentTel.file_size_bytes / 1024).toFixed(1)} KB` : '95.3 KB'}</span>
              </div>
            </div>
          </div>

          {/* Telemetry Diagnostics Card */}
          <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#DEDED2]">
              <Activity className="w-4 h-4 text-[#284E1A]" />
              <h3 className="font-bold text-sm text-[#30312F] m-0">Edge Node Telemetry ({selectedCam.toUpperCase()})</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-1">
                <span className="text-[#85847E] flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" /> อุณหภูมิชิป (Chip Temp)
                </span>
                <span className="text-base font-bold font-mono text-[#30312F]">
                  {telMeta.chip_temp_c ? `${telMeta.chip_temp_c.toFixed(1)} °C` : '43.9 °C'}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">Safe Thermal Zone (&lt; 58°C)</span>
              </div>

              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-1">
                <span className="text-[#85847E] flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-blue-600" /> สัญญาณ Wi-Fi (RSSI)
                </span>
                <span className="text-base font-bold font-mono text-[#30312F]">
                  {telMeta.wifi_rssi_dbm ? `${telMeta.wifi_rssi_dbm} dBm` : '-88 dBm'}
                </span>
                <span className="text-[10px] text-[#85847E]">802.1x Enterprise PEAP</span>
              </div>

              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-1">
                <span className="text-[#85847E] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" /> Free Heap RAM
                </span>
                <span className="text-base font-bold font-mono text-[#30312F]">
                  {telMeta.free_heap ? `${Math.round(telMeta.free_heap / 1024)} KB` : '157 KB'}
                </span>
                <span className="text-[10px] text-[#85847E]">PSRAM: {telMeta.free_psram ? `${(telMeta.free_psram / 1048576).toFixed(1)} MB` : '4.1 MB'}</span>
              </div>

              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] flex flex-col gap-1">
                <span className="text-[#85847E] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Active Uptime / Wake
                </span>
                <span className="text-base font-bold font-mono text-[#30312F]">
                  {telMeta.uptime_sec ? `${telMeta.uptime_sec} วินาที` : '3 วินาที'}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">Fast Cycle (RTC Wake)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Tuning Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Deep Sleep & Timing Management */}
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#284E1A]">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#30312F] m-0">1. การตั้งเวลา Deep Sleep (วงจรตื่น-หลับ)</h3>
                  <p className="text-xs text-[#85847E] m-0 mt-0.5">ควบคุมความถี่การส่งภาพและการระบายความร้อนของชิป ESP32-CAM</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#E7F4D8] text-[#284E1A] rounded-full">
                SCHEDULED SLEEP
              </span>
            </div>

            {/* Daytime Deep Sleep Configuration */}
            <div className={`p-4 rounded-[18px] border space-y-3 transition-all ${
              (currentSettings.day_sleep_mode || 'model') === 'model'
                ? 'bg-[#F4F9EE] border-[#C2E2A3]'
                : 'bg-[#FAF8EF] border-[#DEDED2]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <label className="text-xs font-bold text-[#30312F] flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>เวลากลางวัน / เวลาทำการ (07:30 - 18:30 น.)</span>
                </label>
                
                {/* Mode Selector Dropdown (Inside Daytime Card) */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="relative inline-block">
                    <select
                      value={currentSettings.day_sleep_mode || 'model'}
                      onChange={(e) => handleFieldChange('day_sleep_mode', e.target.value)}
                      className="appearance-none text-xs font-semibold bg-white hover:bg-[#FAF8EF] border border-[#DEDED2] rounded-full pl-3.5 pr-8 py-1.5 text-[#30312F] outline-none cursor-pointer focus:ring-2 focus:ring-[#284E1A]/20 transition-all shadow-2xs"
                    >
                      <option value="model">ใช้ AI Model (อัตโนมัติ 10s–45s)</option>
                      <option value="manual">ตั้งค่าเวลาเอง (Manual Fixed)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#686962] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Mode Description Banner */}
              {(currentSettings.day_sleep_mode || 'model') === 'model' ? (
                <div className="p-3 bg-white/80 rounded-[14px] border border-[#D7ECC0] flex items-start gap-2.5 text-xs text-[#284E1A]">
                  <Brain className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold">โมเดล AI ควบคุมอัตโนมัติ: </span>
                    <span>
                      คำนวณและปรับเวลานอนแบบ Dynamic (10s–45s) ตามอัตราการเข้า-ออกของรถ (Traffic Flux), อุณหภูมิชิป ESP32 และช่วงเวลาคาบเรียนของมหาวิทยาลัย
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#85847E] leading-relaxed m-0">
                  โหมดกำหนดเวลาคงที่: กล้องจะหลับตามจำนวนวินาทีที่ท่านระบุไว้ด้านล่างนี้ตลอดช่วงเวลากลางวัน
                </p>
              )}

              {/* Preset Chips */}
              <div className="space-y-1.5 pt-1">
                {(currentSettings.day_sleep_mode || 'model') === 'model' && (
                  <span className="text-[11px] text-[#686962] font-medium block">
                    กำหนดค่าสำรองกรณีออฟไลน์ (Offline Fallback Baseline):
                  </span>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {DAY_SLEEP_PRESETS.map((p) => {
                    const active = (currentSettings.deep_sleep_sec_day || 20) === p.sec
                    return (
                      <button
                        key={p.sec}
                        type="button"
                        onClick={() => {
                          handleFieldChange('deep_sleep_sec_day', p.sec)
                          handleFieldChange('deep_sleep_sec', p.sec)
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-[#30312F] text-white shadow-xs'
                            : 'bg-[#FFFDF7] border border-[#DEDED2] text-[#686962] hover:border-[#B8B8A8]'
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="1"
                  value={currentSettings.deep_sleep_sec_day || 20}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    handleFieldChange('deep_sleep_sec_day', val)
                    handleFieldChange('deep_sleep_sec', val)
                  }}
                  className="w-full accent-[#284E1A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#85847E] font-mono mt-1">
                  <span>5s (เร็วสุด)</span>
                  <span>20s (สมดุล)</span>
                  <span>60s</span>
                  <span>120s (ประหยัดพลังงาน)</span>
                </div>
              </div>
            </div>

            {/* Nighttime Deep Sleep Configuration */}
            <div className="p-4 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#30312F] flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>เวลากลางคืน / นอกเวลาทำการ (18:30 - 07:30 น.)</span>
                </label>
                <span className="text-xs font-mono font-bold text-[#284E1A] bg-white px-2 py-0.5 rounded border border-[#DEDED2] self-start sm:self-auto">
                  {currentSettings.deep_sleep_sec_night || 1800} วินาที ({Math.round((currentSettings.deep_sleep_sec_night || 1800) / 60)} นาที)
                </span>
              </div>
              <p className="text-[11px] text-[#85847E] leading-relaxed m-0">
                โหมด Standby ประหยัดพลังงานคงที่ (ค่าเริ่มต้น 30 นาที) เนื่องจากเวลากลางคืนลานจอดปิดและไม่มีแสงสว่าง ไม่ต้องใช้โมเดลประมวลผล
              </p>

              {/* Preset Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {NIGHT_SLEEP_PRESETS.map((p) => {
                  const active = (currentSettings.deep_sleep_sec_night || 1800) === p.sec
                  return (
                    <button
                      key={p.sec}
                      type="button"
                      onClick={() => handleFieldChange('deep_sleep_sec_night', p.sec)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'bg-[#30312F] text-white shadow-xs'
                          : 'bg-[#FFFDF7] border border-[#DEDED2] text-[#686962] hover:border-[#B8B8A8]'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Card 2: Image Resolution & Quality Settings */}
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-center text-[#284E1A]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#30312F] m-0">2. การปรับแต่งภาพและความละเอียด (Image Settings)</h3>
                  <p className="text-xs text-[#85847E] m-0 mt-0.5">กำหนดค่า Framesize, คุณภาพการบีบอัด JPEG และการหมุนภาพ</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#E7F4D8] text-[#284E1A] rounded-full">
                FRAMESIZE {currentSettings.framesize}
              </span>
            </div>

            {/* Resolution / Framesize Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-[#30312F] block">
                ความละเอียดภาพ (Framesize) ส่งผ่าน 2-Way Control ไปยังกล้อง:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FRAMESIZE_OPTIONS.map((opt) => {
                  const isSelected = currentSettings.framesize === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFieldChange('framesize', opt.value)}
                      className={`p-3 rounded-[16px] border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFFDF7] border-[#284E1A] ring-1 ring-[#284E1A]'
                          : 'bg-[#FAF8EF] border-[#DEDED2] hover:border-[#B8B8A8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#30312F]">
                          {opt.value}: {opt.name} ({opt.res})
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#284E1A]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#85847E] m-0 mt-1">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* JPEG Quality Slider */}
            <div className="p-4 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#30312F]">JPEG Compression Quality</span>
                  <p className="text-[11px] text-[#85847E] m-0">10 = คมชัดสูงสุด (High Quality) | 30 = บีบอัดสูง (ประหยัดแรม)</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#284E1A] bg-white px-2 py-0.5 rounded border border-[#DEDED2]">
                  {currentSettings.quality}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="1"
                value={currentSettings.quality}
                onChange={(e) => handleFieldChange('quality', Number(e.target.value))}
                className="w-full accent-[#284E1A] cursor-pointer"
              />
            </div>

            {/* Rotation and Server Enhancement */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rotation */}
              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] space-y-2">
                <span className="text-xs font-bold text-[#30312F] block">การหมุนภาพ (Rotation)</span>
                <select
                  value={currentSettings.rotation}
                  onChange={(e) => handleFieldChange('rotation', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#DEDED2] rounded-[10px] text-xs font-semibold text-[#30312F] focus:outline-none focus:border-[#284E1A]"
                >
                  <option value="0">0° (ไม่หมุน)</option>
                  <option value="90">90° ตามเข็ม</option>
                  <option value="180">180° (กลับหัว - แนะนำ)</option>
                  <option value="270">270° ทวนเข็ม</option>
                </select>
              </div>

              {/* Server Brightness */}
              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#30312F]">Brightness (Server)</span>
                  <span className="text-[11px] font-mono text-[#284E1A] font-bold">{currentSettings.brightness}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={currentSettings.brightness}
                  onChange={(e) => handleFieldChange('brightness', parseFloat(e.target.value))}
                  className="w-full accent-[#284E1A] cursor-pointer"
                />
              </div>

              {/* Server Contrast */}
              <div className="p-3 bg-[#FAF8EF] border border-[#DEDED2] rounded-[16px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#30312F]">Contrast (Server)</span>
                  <span className="text-[11px] font-mono text-[#284E1A] font-bold">{currentSettings.contrast}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={currentSettings.contrast}
                  onChange={(e) => handleFieldChange('contrast', parseFloat(e.target.value))}
                  className="w-full accent-[#284E1A] cursor-pointer"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#DEDED2] flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs text-[#85847E] hover:text-[#30312F] flex items-center gap-1.5 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
              </button>

              <PillButton
                variant="primary"
                icon={Save}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : `บันทึกคำสั่งสู่ ${selectedCam.toUpperCase()}`}
              </PillButton>
            </div>
          </section>
        </div>
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DEDED2]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <PillTag variant="active">2-WAY HARDWARE CONTROL</PillTag>
              <PillTag variant="neutral">ESP32-CAM V4 READY</PillTag>
              <PillTag variant="neutral">LIVE SYNC ACTIVE</PillTag>
            </div>
            <h3 className="font-sans font-semibold text-[19px] text-[#30312F] m-0 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#284E1A]" />
              <span>แผงควบคุมฮาร์ดแวร์กล้อง & Deep Sleep (2-Way Control)</span>
            </h3>
            <p className="font-sans text-xs text-[#85847E] mt-1 m-0">
              ปรับรอบเวลาหลับ Deep Sleep (กลางวัน/กลางคืน), ความละเอียดภาพ (Framesize), คุณภาพ JPEG (Quality) และดูภาพสด Real-time
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PillButton
              variant="neutral"
              icon={RefreshCw}
              onClick={() => {
                fetchAllData()
                setImgTimestamp(Date.now())
              }}
            >
              รีเฟรชข้อมูล
            </PillButton>
            <PillButton
              variant="primary"
              icon={Save}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'กำลังส่งคำสั่ง...' : 'บันทึก & ซิงค์คำสั่งสู่กล้อง'}
            </PillButton>
          </div>
        </div>
        {mainContent}
      </div>
    )
  }

  return (
    <div className="platform-workspace">
      {/* 1. Breadcrumb */}
      <div className="platform-breadcrumb flex items-center gap-2 text-xs text-[#85847E]">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="hover:text-[#30312F] transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate?.('setup')}
          className="hover:text-[#30312F] transition-colors cursor-pointer"
        >
          Setup & ROI
        </button>
        <span>/</span>
        <span className="text-[#30312F] font-semibold">Camera & Deep Sleep Control</span>
      </div>

      {/* 2. Platform Intro Header */}
      <div className="platform-intro flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#DEDED2] w-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PillTag variant="active">2-WAY HARDWARE CONTROL</PillTag>
            <PillTag variant="neutral">ESP32-CAM V4 READY</PillTag>
            <PillTag variant="neutral">LIVE SYNC ACTIVE</PillTag>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#30312F]">
            Camera & Deep Sleep Control Center
          </h1>
          <p className="text-sm text-[#85847E] mt-2 max-w-3xl leading-relaxed">
            แผงควบคุมการตั้งค่าฮาร์ดแวร์ Edge Node ทั้ง 3 ตัวแบบ 2-Way: ปรับรอบเวลาหลับ Deep Sleep (กลางวัน/กลางคืน) เพื่อคุมอุณหภูมิชิป และปรับแต่งความละเอียดภาพ (Framesize), คุณภาพ JPEG (Quality), การหมุน และแสงสี พร้อมพรีวิวภาพสด Real-time
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PillButton
            variant="neutral"
            icon={RefreshCw}
            onClick={() => {
              fetchAllData()
              setImgTimestamp(Date.now())
            }}
          >
            รีเฟรชข้อมูล
          </PillButton>
          <PillButton
            variant="primary"
            icon={Save}
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? 'กำลังส่งคำสั่ง...' : 'บันทึก & ซิงค์คำสั่งสู่กล้อง'}
          </PillButton>
        </div>
      </div>

      {mainContent}
    </div>
  )
}
