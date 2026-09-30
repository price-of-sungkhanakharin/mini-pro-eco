import React, { useState } from 'react'
import {
  Settings,
  Smartphone,
  MapPin,
  MessageSquare,
  HardDrive,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Radio,
  ExternalLink,
  Layers
} from 'lucide-react'
import ParkingSetup from './ParkingSetup.jsx'
import RoboflowStudio from './RoboflowStudio.jsx'

export default function SetupView({
  onNavigate,
  initialCameraId = 'cam1',
  initialTab = 'cameras',
  apiBase
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedSlotCam, setSelectedSlotCam] = useState(initialCameraId)
  const [saved, setSaved] = useState(false)

  // Initial state for 3 smartphone cameras
  const [camConfig, setCamConfig] = useState({
    cam1: {
      name: 'ลานหน้าภาควิชาคอมพิวเตอร์',
      ip: '192.168.1.101',
      port: '8080',
      interval: 5,
      enabled: true
    },
    cam2: {
      name: 'ลานจอดรถในร่มข้างอาคาร',
      ip: '192.168.1.102',
      port: '8080',
      interval: 5,
      enabled: true
    },
    cam3: {
      name: 'ลานจอดด้านหลังภาควิชา',
      ip: '192.168.1.103',
      port: '8080',
      interval: 5,
      enabled: true
    }
  })

  const [lineConfig, setLineConfig] = useState({
    channelSecret: '••••••••••••••••••••••••••••••••',
    channelAccessToken: '••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
    webhookUrl: 'https://api.cpe.eng.psu.ac.th/api/v1/line/webhook'
  })

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="setup-view-container">
      {/* Top Banner */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3">
          <div className="setup-icon-box">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span>System & Camera Setup</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                Ready for Configuration
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              หน้าควบคุมการตั้งค่าระบบ (คุณสามารถสั่งการหรือแจ้งรายละเอียดฟังก์ชันเพิ่มเติมที่ต้องการให้เขียนในหน้านี้ได้ทันที)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="btn-save-setup"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {saved && (
        <div className="alert-setup-saved">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>บันทึกการตั้งค่าระบบเรียบร้อยแล้ว</span>
        </div>
      )}

      {/* Setup Sub-Navigation Tabs */}
      <div className="setup-tabs-bar">
        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'cameras' ? 'active' : ''}`}
          onClick={() => setActiveTab('cameras')}
        >
          <Smartphone className="w-4 h-4" />
          <span>3x Phone Cameras Config</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
          onClick={() => setActiveTab('slots')}
        >
          <MapPin className="w-4 h-4" />
          <span>Parking Slot ROI Setup</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'line' ? 'active' : ''}`}
          onClick={() => setActiveTab('line')}
        >
          <MessageSquare className="w-4 h-4" />
          <span>LINE Chatbot Webhook</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <HardDrive className="w-4 h-4" />
          <span>MinIO & DB Connection</span>
        </button>

        <button
          type="button"
          className={`setup-tab-btn ${activeTab === 'roboflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('roboflow')}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Roboflow Project</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="setup-content-card">
        {activeTab === 'cameras' && (
          <div className="setup-section">
            <h3 className="section-title-sm">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              การตั้งค่าจุดกล้องสมาร์ทโฟน 3 ตัว (Edge Capture Ingestion)
            </h3>
            <p className="section-desc">
              กำหนดค่า IP Address, พอร์ต และความถี่การส่งภาพ Snapshot (ค่าเริ่มต้น 5 วินาที) ของกล้องสมาร์ทโฟนแต่ละจุด
            </p>

            <div className="camera-config-grid">
              {/* Camera 1 */}
              <div className="cam-setup-card">
                <div className="cam-setup-card-header">
                  <span className="font-mono font-bold text-emerald-400">CAM-01</span>
                  <span className="status-tag active">Active Node</span>
                </div>
                <div className="form-group-setup">
                  <label>ชื่อจุดติดตั้ง:</label>
                  <input
                    type="text"
                    value={camConfig.cam1.name}
                    onChange={(e) =>
                      setCamConfig({
                        ...camConfig,
                        cam1: { ...camConfig.cam1, name: e.target.value }
                      })
                    }
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>IP สมาร์ทโฟน:</label>
                    <input
                      type="text"
                      value={camConfig.cam1.ip}
                      onChange={(e) =>
                        setCamConfig({
                          ...camConfig,
                          cam1: { ...camConfig.cam1, ip: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div className="form-group-setup">
                    <label>Interval (วินาที):</label>
                    <input
                      type="number"
                      value={camConfig.cam1.interval}
                      onChange={(e) =>
                        setCamConfig({
                          ...camConfig,
                          cam1: { ...camConfig.cam1, interval: Number(e.target.value) }
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotCam('cam1')
                    setActiveTab('slots')
                  }}
                  className="w-full mt-3 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>✏️ วาดพิกัดช่องจอด ROI (CAM-01)</span>
                </button>
              </div>

              {/* Camera 2 */}
              <div className="cam-setup-card">
                <div className="cam-setup-card-header">
                  <span className="font-mono font-bold text-emerald-400">CAM-02</span>
                  <span className="status-tag active">Active Node</span>
                </div>
                <div className="form-group-setup">
                  <label>ชื่อจุดติดตั้ง:</label>
                  <input
                    type="text"
                    value={camConfig.cam2.name}
                    onChange={(e) =>
                      setCamConfig({
                        ...camConfig,
                        cam2: { ...camConfig.cam2, name: e.target.value }
                      })
                    }
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>IP สมาร์ทโฟน:</label>
                    <input
                      type="text"
                      value={camConfig.cam2.ip}
                      onChange={(e) =>
                        setCamConfig({
                          ...camConfig,
                          cam2: { ...camConfig.cam2, ip: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div className="form-group-setup">
                    <label>Interval (วินาที):</label>
                    <input
                      type="number"
                      value={camConfig.cam2.interval}
                      onChange={(e) =>
                        setCamConfig({
                          ...camConfig,
                          cam2: { ...camConfig.cam2, interval: Number(e.target.value) }
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotCam('cam2')
                    setActiveTab('slots')
                  }}
                  className="w-full mt-3 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>✏️ วาดพิกัดช่องจอด ROI (CAM-02)</span>
                </button>
              </div>

              {/* Camera 3 */}
              <div className="cam-setup-card">
                <div className="cam-setup-card-header">
                  <span className="font-mono font-bold text-emerald-400">CAM-03</span>
                  <span className="status-tag active">Active Node</span>
                </div>
                <div className="form-group-setup">
                  <label>ชื่อจุดติดตั้ง:</label>
                  <input
                    type="text"
                    value={camConfig.cam3.name}
                    onChange={(e) =>
                      setCamConfig({
                        ...camConfig,
                        cam3: { ...camConfig.cam3, name: e.target.value }
                      })
                    }
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group-setup">
                    <label>IP สมาร์ทโฟน:</label>
                    <input
                      type="text"
                      value={camConfig.cam3.ip}
                      onChange={(e) =>
                        setCamConfig({
                          ...camConfig,
                          cam3: { ...camConfig.cam3, ip: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div className="form-group-setup">
                    <label>Interval (วินาที):</label>
                    <input
                      type="number"
                      value={camConfig.cam3.interval}
                      onChange={(e) =>
                        setCamConfig({
                          ...camConfig,
                          cam3: { ...camConfig.cam3, interval: Number(e.target.value) }
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotCam('cam3')
                    setActiveTab('slots')
                  }}
                  className="w-full mt-3 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>✏️ วาดพิกัดช่องจอด ROI (CAM-03)</span>
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
            />
          </div>
        )}

        {activeTab === 'line' && (
          <div className="setup-section">
            <h3 className="section-title-sm">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              การเชื่อมต่อ LINE Messaging API & Webhook
            </h3>
            <p className="section-desc">
              ตั้งค่า Token และ Webhook URL สำหรับบอทตอบคำถามผู้ใช้งานนอกมหาวิทยาลัย
            </p>
            <div className="form-group-setup mb-3">
              <label>FastAPI LINE Webhook URL (สำหรับนำไปใส่ใน LINE Developers Console):</label>
              <input type="text" readOnly value={lineConfig.webhookUrl} className="font-mono bg-slate-900/80" />
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
              <HardDrive className="w-4 h-4 text-indigo-400" />
              MinIO Storage & PostgreSQL Database Configuration
            </h3>
            <p className="section-desc">
              โครงสร้างที่ใช้จัดเก็บไฟล์ภาพดิบและผลการทำนายใน AI Ecosystem
            </p>
            <div className="info-box-setup">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">MinIO Endpoint:</span>
                <span className="font-mono text-emerald-400">localhost:9000 (Console: 9001)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Raw Images Bucket:</span>
                <span className="font-mono text-cyan-400">parking-raw</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">PostgreSQL Host:</span>
                <span className="font-mono text-slate-300">localhost:5432 (ai_ecosystem)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Redis Broker:</span>
                <span className="font-mono text-slate-300">localhost:6379</span>
              </div>
            </div>
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
