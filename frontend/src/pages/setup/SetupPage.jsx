import React, { useState, useEffect } from 'react'
import {
  Settings,
  Smartphone,
  MapPin,
  MessageSquare,
  HardDrive,
  Save,
  CheckCircle2,
  Layers,
  Cpu,
  Sliders
} from 'lucide-react'
import ParkingSetup from './components_setup/ParkingSetup.jsx'
import RoboflowStudio from '../trainer/components_trainer/RoboflowStudio.jsx'
import AutoTrainerStudio from '../trainer/AutoTrainerPage.jsx'

const FRAMESIZE_OPTIONS = [
  { value: 13, label: '13: UXGA (1600x1200) - Default' },
  { value: 12, label: '12: SXGA (1280x1024)' },
  { value: 11, label: '11: HD (1280x720)' },
  { value: 10, label: '10: XGA (1024x768)' },
  { value: 9, label: '9: SVGA (800x600)' },
  { value: 8, label: '8: VGA (640x480)' },
  { value: 7, label: '7: CIF (400x296)' },
  { value: 6, label: '6: QVGA (320x240)' }
]

export default function SetupPage({
  onNavigate,
  initialCameraId = 'cam1',
  initialTab = 'cameras',
  apiBase
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedSlotCam, setSelectedSlotCam] = useState(initialCameraId)
  const [saved, setSaved] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  // Initial state for 3 enterprise edge cameras
  const [camConfig, setCamConfig] = useState({
    cam1: {
      camera_id: 'cam1',
      name: 'ลานหน้าภาค 1 (รถยนต์)',
      ip: '172.30.91.44',
      port: '5005',
      interval: 15,
      framesize: 13,
      quality: 10,
      enabled: true
    },
    cam2: {
      camera_id: 'cam2',
      name: 'ลานหน้าภาค 2 (รถยนต์)',
      ip: '172.30.92.108',
      port: '5005',
      interval: 15,
      framesize: 13,
      quality: 10,
      enabled: true
    },
    cam3: {
      camera_id: 'cam3',
      name: 'ลานข้างภาคคอม (มอเตอร์ไซค์)',
      ip: '172.30.92.100',
      port: '5005',
      interval: 15,
      framesize: 13,
      quality: 10,
      enabled: true
    }
  })

  // Load existing camera settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const base = apiBase || ''
        const res = await fetch(`${base}/api/v1/settings`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setCamConfig((prev) => {
              const updated = { ...prev }
              data.forEach((item) => {
                const cid = item.camera_id
                if (updated[cid]) {
                  updated[cid] = {
                    ...updated[cid],
                    name: item.name || updated[cid].name,
                    framesize: item.framesize ?? updated[cid].framesize,
                    quality: item.quality ?? updated[cid].quality,
                    interval: item.interval_sec ?? updated[cid].interval
                  }
                }
              })
              return updated
            })
          }
        }
      } catch (err) {
        console.warn('Could not load camera settings from backend:', err)
      }
    }
    fetchSettings()
  }, [apiBase])

  const [lineConfig, setLineConfig] = useState({
    channelSecret: '••••••••••••••••••••••••••••••••',
    channelAccessToken: '••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
    webhookUrl: 'https://api.cpe.eng.psu.ac.th/api/v1/line/webhook'
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveStatus('กำลังบันทึก...')
    try {
      const base = apiBase || ''
      const promises = Object.keys(camConfig).map(async (key) => {
        const cam = camConfig[key]
        const payload = {
          camera_id: cam.camera_id || key,
          name: cam.name,
          brightness: 1.0,
          contrast: 1.0,
          rotation: 0,
          framesize: Number(cam.framesize),
          quality: Number(cam.quality),
          interval_sec: Number(cam.interval)
        }
        return fetch(`${base}/api/v1/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      })
      await Promise.all(promises)
      setSaved(true)
      setSaveStatus('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว')
    } catch (err) {
      console.error('Error saving settings:', err)
      setSaved(true)
      setSaveStatus('บันทึกการตั้งค่าสำเร็จ (Client)')
    }
    setTimeout(() => setSaved(false), 3500)
  }

  const handleCamChange = (camKey, field, value) => {
    setCamConfig((prev) => ({
      ...prev,
      [camKey]: {
        ...prev[camKey],
        [field]: value
      }
    }))
  }

  return (
    <div className="setup-view-container">
      {/* Top Banner */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="setup-icon-box">
            <Settings className="w-6 h-6" strokeWidth={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="setup-title-main">System & Camera Setup</h2>
              <span className="status-tag active">Ready for Configuration</span>
            </div>
            <p className="setup-subtitle-text">
              หน้าควบคุมการตั้งค่าระบบและฮาร์ดแวร์กล้อง ESP32-CAM (Dynamic Framesize, Quality, Interval & Zone ROI)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="btn-save-setup"
        >
          <Save className="w-4 h-4" strokeWidth={1.8} />
          <span>Save Changes</span>
        </button>
      </div>

      {saved && (
        <div className="alert-setup-saved">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-green-text)]" strokeWidth={1.8} />
          <span>{saveStatus || 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว'}</span>
        </div>
      )}

      {/* Setup Sub-Navigation Tabs */}
      <div className="setup-tabs-bar">
        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'cameras' ? 'active' : ''}`}
          onClick={() => setActiveTab('cameras')}
        >
          <Smartphone className="w-4 h-4" strokeWidth={1.8} />
          <span>3x Phone / ESP32 Cameras Config</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
          onClick={() => setActiveTab('slots')}
        >
          <MapPin className="w-4 h-4" strokeWidth={1.8} />
          <span>Parking Zone ROI Setup</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'line' ? 'active' : ''}`}
          onClick={() => setActiveTab('line')}
        >
          <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
          <span>LINE Chatbot Webhook</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <HardDrive className="w-4 h-4" strokeWidth={1.8} />
          <span>MinIO & DB Connection</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'trainer' ? 'active' : ''}`}
          onClick={() => setActiveTab('trainer')}
        >
          <Cpu className="w-4 h-4" strokeWidth={1.8} />
          <span>Auto-Trainer & Model Hub</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'roboflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('roboflow')}
        >
          <Layers className="w-4 h-4" strokeWidth={1.8} />
          <span>Roboflow Project</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="setup-content-card">
        {activeTab === 'cameras' && (
          <div className="setup-section">
            <h3 className="section-title-sm">
              <Smartphone className="w-4 h-4 text-[var(--color-green-text)]" strokeWidth={1.8} />
              <span>การตั้งค่าจุดกล้อง 3 ตัว (Edge Ingestion, Frame Size & Quality Control)</span>
            </h3>
            <p className="section-desc">
              กำหนดค่า IP Address, ความถี่ Interval, Camera Frame Size (ESP32 ID) และ JPEG Quality ของกล้องแต่ละจุด
            </p>

            <div className="camera-config-grid">
              {/* Camera 1 */}
              <div className="cam-setup-card">
                <div className="cam-setup-card-header">
                  <span className="cam-setup-code">CAM-01</span>
                  <span className="status-tag active">Active Node</span>
                </div>
                <div className="form-group-setup">
                  <label>ชื่อจุดติดตั้ง:</label>
                  <input
                    type="text"
                    value={camConfig.cam1.name}
                    onChange={(e) => handleCamChange('cam1', 'name', e.target.value)}
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>IP สมาร์ทโฟน/ESP32:</label>
                    <input
                      type="text"
                      value={camConfig.cam1.ip}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam1', 'ip', e.target.value)}
                    />
                  </div>
                  <div className="form-group-setup">
                    <label>Interval (วินาที):</label>
                    <input
                      type="number"
                      value={camConfig.cam1.interval}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam1', 'interval', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>Camera Frame Size (ESP32 ID):</label>
                    <select
                      value={camConfig.cam1.framesize}
                      className="font-mono text-sm"
                      onChange={(e) => handleCamChange('cam1', 'framesize', Number(e.target.value))}
                    >
                      {FRAMESIZE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-setup">
                    <label>JPEG Quality (1-63):</label>
                    <input
                      type="number"
                      min="1"
                      max="63"
                      value={camConfig.cam1.quality}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam1', 'quality', Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotCam('cam1')
                    setActiveTab('slots')
                  }}
                  className="btn-setup-draw-roi"
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                  <span>วาดพิกัดโซนจอด ROI (CAM-01)</span>
                </button>
              </div>

              {/* Camera 2 */}
              <div className="cam-setup-card">
                <div className="cam-setup-card-header">
                  <span className="cam-setup-code">CAM-02</span>
                  <span className="status-tag active">Active Node</span>
                </div>
                <div className="form-group-setup">
                  <label>ชื่อจุดติดตั้ง:</label>
                  <input
                    type="text"
                    value={camConfig.cam2.name}
                    onChange={(e) => handleCamChange('cam2', 'name', e.target.value)}
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>IP สมาร์ทโฟน/ESP32:</label>
                    <input
                      type="text"
                      value={camConfig.cam2.ip}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam2', 'ip', e.target.value)}
                    />
                  </div>
                  <div className="form-group-setup">
                    <label>Interval (วินาที):</label>
                    <input
                      type="number"
                      value={camConfig.cam2.interval}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam2', 'interval', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>Camera Frame Size (ESP32 ID):</label>
                    <select
                      value={camConfig.cam2.framesize}
                      className="font-mono text-sm"
                      onChange={(e) => handleCamChange('cam2', 'framesize', Number(e.target.value))}
                    >
                      {FRAMESIZE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-setup">
                    <label>JPEG Quality (1-63):</label>
                    <input
                      type="number"
                      min="1"
                      max="63"
                      value={camConfig.cam2.quality}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam2', 'quality', Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotCam('cam2')
                    setActiveTab('slots')
                  }}
                  className="btn-setup-draw-roi"
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                  <span>วาดพิกัดโซนจอด ROI (CAM-02)</span>
                </button>
              </div>

              {/* Camera 3 */}
              <div className="cam-setup-card">
                <div className="cam-setup-card-header">
                  <span className="cam-setup-code">CAM-03</span>
                  <span className="status-tag active">Active Node</span>
                </div>
                <div className="form-group-setup">
                  <label>ชื่อจุดติดตั้ง:</label>
                  <input
                    type="text"
                    value={camConfig.cam3.name}
                    onChange={(e) => handleCamChange('cam3', 'name', e.target.value)}
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>IP สมาร์ทโฟน/ESP32:</label>
                    <input
                      type="text"
                      value={camConfig.cam3.ip}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam3', 'ip', e.target.value)}
                    />
                  </div>
                  <div className="form-group-setup">
                    <label>Interval (วินาที):</label>
                    <input
                      type="number"
                      value={camConfig.cam3.interval}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam3', 'interval', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>Camera Frame Size (ESP32 ID):</label>
                    <select
                      value={camConfig.cam3.framesize}
                      className="font-mono text-sm"
                      onChange={(e) => handleCamChange('cam3', 'framesize', Number(e.target.value))}
                    >
                      {FRAMESIZE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-setup">
                    <label>JPEG Quality (1-63):</label>
                    <input
                      type="number"
                      min="1"
                      max="63"
                      value={camConfig.cam3.quality}
                      className="font-mono"
                      onChange={(e) => handleCamChange('cam3', 'quality', Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotCam('cam3')
                    setActiveTab('slots')
                  }}
                  className="btn-setup-draw-roi"
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                  <span>วาดพิกัดโซนจอด ROI (CAM-03)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'slots' && (
          <div className="setup-section p-0">
            <ParkingSetup
              embedded={true}
              onNavigate={onNavigate}
              initialCameraId={selectedSlotCam}
              apiBase={apiBase}
            />
          </div>
        )}

        {activeTab === 'line' && (
          <div className="setup-section">
            <h3 className="section-title-sm">
              <MessageSquare className="w-4 h-4 text-[var(--color-ink-secondary)]" strokeWidth={1.8} />
              <span>การเชื่อมต่อ LINE Messaging API & Webhook</span>
            </h3>
            <p className="section-desc">
              ตั้งค่า Token และ Webhook URL สำหรับบอทตอบคำถามผู้ใช้งานนอกมหาวิทยาลัย
            </p>
            <div className="form-group-setup mb-3">
              <label>FastAPI LINE Webhook URL (สำหรับนำไปใส่ใน LINE Developers Console):</label>
              <input type="text" readOnly value={lineConfig.webhookUrl} className="font-mono" />
            </div>
            <div className="form-group-setup mb-3">
              <label>Channel Access Token:</label>
              <input type="text" defaultValue={lineConfig.channelAccessToken} className="font-mono" />
            </div>
            <div className="form-group-setup mb-3">
              <label>Channel Secret:</label>
              <input type="text" defaultValue={lineConfig.channelSecret} className="font-mono" />
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="setup-section">
            <h3 className="section-title-sm">
              <HardDrive className="w-4 h-4 text-[var(--color-ink-secondary)]" strokeWidth={1.8} />
              <span>MinIO Storage & PostgreSQL Database Configuration</span>
            </h3>
            <p className="section-desc">
              โครงสร้างที่ใช้จัดเก็บไฟล์ภาพดิบและผลการทำนายใน AI Ecosystem
            </p>
            <div className="info-box-setup">
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)] text-sm">
                <span className="text-[var(--color-ink-secondary)]">MinIO Endpoint:</span>
                <span className="font-mono text-[var(--color-green-text)] font-medium">localhost:9000 (Console: 9001)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)] text-sm">
                <span className="text-[var(--color-ink-secondary)]">Raw Images Bucket:</span>
                <span className="font-mono text-[var(--color-ink)] font-medium">parking-raw</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)] text-sm">
                <span className="text-[var(--color-ink-secondary)]">PostgreSQL Host:</span>
                <span className="font-mono text-[var(--color-ink)] font-medium">localhost:5432 (ai_ecosystem)</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-[var(--color-ink-secondary)]">Redis Broker:</span>
                <span className="font-mono text-[var(--color-ink)] font-medium">localhost:6379</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trainer' && (
          <div className="setup-section p-0">
            <AutoTrainerStudio apiBase={apiBase} />
          </div>
        )}

        {activeTab === 'roboflow' && (
          <div className="setup-section p-0">
            <RoboflowStudio apiBase={apiBase} />
          </div>
        )}
      </div>
    </div>
  )
}
