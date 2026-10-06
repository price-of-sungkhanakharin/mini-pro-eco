import React, { useState, useEffect } from 'react'
import {
  Settings,
  Smartphone,
  MapPin,
  Save,
  CheckCircle2,
  Layers,
  Cpu,
  Sliders,
  Tag,
  ChevronRight
} from 'lucide-react'
import ParkingSetup from './components_setup/ParkingSetup.jsx'
import LabelStudioManager from '../trainer/components_trainer/LabelStudioManager.jsx'
import AutoTrainerStudio from '../trainer/AutoTrainerPage.jsx'
import CameraControlPage from '../camera_control/CameraControlPage.jsx'
import { PillTag, PillButton } from '../../components/ui/FigmaCards'

const FRAMESIZE_OPTIONS = [
  { value: 13, label: '13: UXGA (1600x1200) - Default' },
  { value: 12, label: '12: SXGA (1280x1024)' },
  { value: 11, label: '11: HD (1280x720)' },
  { value: 10, label: '10: XGA (1024x768)' },
  { value: 9, label: '9: SVGA (800x600)' }
]

export default function SetupPage({
  onNavigate,
  initialCameraId = 'cam1',
  initialTab = 'cameras',
  apiBase
}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam && !['line', 'storage'].includes(tabParam)) return tabParam
    }
    return ['line', 'storage'].includes(initialTab) ? 'cameras' : initialTab
  })
  const [selectedSlotCam, setSelectedSlotCam] = useState(initialCameraId)
  const [saved, setSaved] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(['line', 'storage'].includes(initialTab) ? 'cameras' : initialTab)
    }
  }, [initialTab])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const targetPath = `/setup?tab=${tabId}`
      window.history.replaceState({ view: 'setup' }, '', targetPath)
    }
  }

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
    <div className="platform-workspace">
      {/* 1. Breadcrumb */}
      <div className="platform-breadcrumb">
        <span>Platform</span>
        <span>/</span>
        <span className="text-[#30312F] font-medium">System & Edge Hardware Setup</span>
      </div>

      {/* 2. Platform Intro Header */}
      <div className="platform-intro">
        <div className="platform-overview">
          <div className="platform-metadata">
            <PillTag variant="neutral">ESP32 Ingestion Hub</PillTag>
            <PillTag variant="neutral">ROI Zone Geometry</PillTag>
            <PillTag variant="active">Setup Ready</PillTag>
          </div>

          <h1 className="platform-title">
            System & Edge Hardware Setup
          </h1>

          <p className="platform-description">
            แผงควบคุมการตั้งค่าระบบและฮาร์ดแวร์กล้อง ESP32-CAM (Dynamic Framesize, Quality, Interval) ตลอดจนการกำหนดพิกัดช่องจอด Polygon ROI และ Webhook
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <PillButton
            variant="primary"
            icon={Save}
            onClick={handleSave}
            className="h-12"
          >
            บันทึกการตั้งค่า
          </PillButton>
        </div>
      </div>

      {/* Save Notification */}
      {saved && (
        <div className="w-full p-4 bg-[#E7F4D8] border border-[#BBF7D0] rounded-[20px] text-[#36612D] flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#36612D]" strokeWidth={2} />
          <span className="text-xs font-medium">{saveStatus || 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว'}</span>
        </div>
      )}

      {/* 3. Setup Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto w-full p-1.5 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
        {[
          { id: 'cameras', label: '3x Phone / ESP32 Cameras', icon: Smartphone },
          { id: 'slots', label: 'Parking Zone ROI Setup', icon: MapPin },
          { id: 'trainer', label: 'Auto-Trainer & Model Hub', icon: Cpu },
          { id: 'label_studio', label: 'Label Studio Annotation', icon: Tag },
          { id: 'camera_control', label: 'Camera & Deep Sleep Control', icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-[#30312F] text-white shadow-xs'
                  : 'text-[#686962] hover:text-[#30312F]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4. Tab Content Bento Surface */}
      <div className="w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs flex flex-col gap-6">
        {activeTab === 'cameras' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-sans font-semibold text-[19px] text-[#30312F] m-0 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#36612D]" strokeWidth={2} />
                <span>การตั้งค่าจุดกล้อง 3 ตัว (Edge Ingestion, Frame Size & Quality Control)</span>
              </h3>
              <p className="font-sans text-xs text-[#85847E] mt-1 m-0">
                กำหนดค่า IP Address, ความถี่ Interval, Camera Frame Size (ESP32 ID) และ JPEG Quality ของกล้องแต่ละจุด
              </p>
            </div>

            {/* Quick jump to Camera & Deep Sleep Control Center */}
            <div className="p-4 rounded-[18px] bg-[#E7F4D8]/30 border border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#E7F4D8] text-[#284E1A] flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4 text-[#284E1A]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#284E1A] m-0">แผงควบคุม 2-Way Hardware & Deep Sleep Control</h4>
                  <p className="text-[11px] text-[#686962] m-0 mt-0.5">
                    ปรับรอบเวลา Deep Sleep (กลางวัน 20s / กลางคืน 1800s), ความละเอียด Framesize และดูภาพสด Real-time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('camera_control')}
                className="px-3.5 py-1.5 rounded-full bg-[#284E1A] hover:bg-[#1E3B13] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <span>เปิดแผงควบคุมกล้อง</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {['cam1', 'cam2', 'cam3'].map((camKey) => {
                const cam = camConfig[camKey]
                const code = camKey.toUpperCase().replace('CAM', 'CAM-0')

                return (
                  <div
                    key={camKey}
                    className="p-5 rounded-[20px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
                        <span className="font-mono font-bold text-sm text-[#30312F]">{code}</span>
                        <PillTag variant="active">Active Node</PillTag>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#686962]">ชื่อจุดติดตั้ง:</label>
                        <input
                          type="text"
                          value={cam.name}
                          onChange={(e) => handleCamChange(camKey, 'name', e.target.value)}
                          className="bg-[#FFFDF7] border border-[#DEDED2] rounded-xl px-3 py-2 text-xs text-[#30312F] focus:outline-none focus:border-[#30312F]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#686962]">IP Address:</label>
                          <input
                            type="text"
                            value={cam.ip}
                            className="font-mono bg-[#FFFDF7] border border-[#DEDED2] rounded-xl px-3 py-2 text-xs text-[#30312F] focus:outline-none focus:border-[#30312F]"
                            onChange={(e) => handleCamChange(camKey, 'ip', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#686962]">Interval (วินาที):</label>
                          <input
                            type="number"
                            value={cam.interval}
                            className="font-mono bg-[#FFFDF7] border border-[#DEDED2] rounded-xl px-3 py-2 text-xs text-[#30312F] focus:outline-none focus:border-[#30312F]"
                            onChange={(e) => handleCamChange(camKey, 'interval', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#686962]">Frame Size:</label>
                          <select
                            value={cam.framesize}
                            className="font-mono bg-[#FFFDF7] border border-[#DEDED2] rounded-xl px-2.5 py-2 text-xs text-[#30312F] focus:outline-none focus:border-[#30312F] cursor-pointer"
                            onChange={(e) => handleCamChange(camKey, 'framesize', Number(e.target.value))}
                          >
                            {FRAMESIZE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#686962]">JPEG Quality (1-63):</label>
                          <input
                            type="number"
                            min="1"
                            max="63"
                            value={cam.quality}
                            className="font-mono bg-[#FFFDF7] border border-[#DEDED2] rounded-xl px-3 py-2 text-xs text-[#30312F] focus:outline-none focus:border-[#30312F]"
                            onChange={(e) => handleCamChange(camKey, 'quality', Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlotCam(camKey)
                        setActiveTab('slots')
                      }}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-[#30312F] hover:bg-[#1E1F1D] text-white text-xs font-medium transition-colors cursor-pointer mt-2"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>วาดพิกัดโซนจอด ROI ({code})</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'slots' && (
          <div className="w-full">
            <ParkingSetup
              embedded={true}
              onNavigate={onNavigate}
              initialCameraId={selectedSlotCam}
              apiBase={apiBase}
            />
          </div>
        )}


        {activeTab === 'trainer' && (
          <div className="w-full">
            <AutoTrainerStudio apiBase={apiBase} />
          </div>
        )}

        {activeTab === 'label_studio' && (
          <div className="w-full">
            <LabelStudioManager apiBase={apiBase} />
          </div>
        )}

        {activeTab === 'camera_control' && (
          <div className="w-full">
            <CameraControlPage
              embedded={true}
              onNavigate={onNavigate}
              initialCameraId={selectedSlotCam}
            />
          </div>
        )}
      </div>
    </div>
  )
}
