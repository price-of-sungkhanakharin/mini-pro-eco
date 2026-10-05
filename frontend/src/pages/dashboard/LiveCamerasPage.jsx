import React, { useState } from 'react'
import {
  Minimize2,
  Maximize2,
  RefreshCw,
  Sliders,
  Layers,
  Car,
  Bike,
  Cpu,
  Wifi,
  Thermometer,
  Clock,
  HardDrive,
  AlertTriangle,
  ArrowLeft,
  Grid,
  Square
} from 'lucide-react'
import { useDashboardData } from './useDashboardData'

export default function LiveCamerasPage({ onOpenModal, onNavigate }) {
  const {
    countdown,
    isRefreshing,
    handleManualRefresh,
    showRoiOverlay,
    setShowRoiOverlay,
    cam1,
    cam2,
    cam3
  } = useDashboardData()

  const [activeCamTab, setActiveCamTab] = useState('all') // 'all' | 'cam1' | 'cam2' | 'cam3'

  const cameras = [cam1, cam2, cam3].filter(Boolean)
  const onlineCount = cameras.filter((c) => c?.isOnline).length

  return (
    <div className="flex flex-col items-start px-4 sm:px-6 lg:px-10 py-6 gap-6 w-full max-w-[1440px] mx-auto box-border">
      {/* 1. Top Breadcrumb & Back to Dashboard */}
      <div className="flex items-center justify-between w-full flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs font-sans text-[#85847E]">
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="hover:text-[#30312F] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>แดชบอร์ด</span>
          </button>
          <span>/</span>
          <span className="font-semibold text-[#30312F]">
            โฟกัสกล้องวงจรปิดแบบขยาย (Live Camera Focus)
          </span>
        </div>

        {/* ย่อมุมมอง / กลับสู่แดชบอร์ด Button */}
        <button
          type="button"
          onClick={() => onNavigate?.('dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#CFCFC4] hover:bg-[#FAF8EF] hover:border-[#85847E] rounded-full font-sans font-semibold text-xs sm:text-[13px] text-[#30312F] shadow-2xs transition-all cursor-pointer"
        >
          <Minimize2 className="w-4 h-4 text-[#30312F]" />
          <span>ย่อมุมมอง / กลับสู่แดชบอร์ด</span>
        </button>
      </div>

      {/* 2. Header Intro */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full pb-4 border-b border-[#F4F1E8]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-[#EAF6E8] border border-[#C7E0B8] rounded-full font-sans font-semibold text-xs text-[#4F6B4A] uppercase tracking-wider">
              3-NODE CCTV STREAM
            </span>
            <span className="px-3 py-1 bg-[#FFFFFF] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs text-[#30312F]">
              Live: {onlineCount}/3 กล้องออนไลน์
            </span>
          </div>

          <h1 className="font-sans font-bold text-2xl sm:text-3xl text-[#30312F] tracking-tight">
            มุมมองกล้องวงจรปิดแบบขยาย (Live CCTV Stream)
          </h1>
          <p className="font-sans text-sm text-[#85847E] mt-1 max-w-3xl">
            เน้นโฟกัสที่ภาพจากกล้องความละเอียดสูงทั้ง 3 ตัว แสดงผลตรวจจับแบบเรียลไทม์พร้อมข้อมูลเซนเซอร์ครบถ้วน (คลิกที่ภาพเพื่อเปิดดูป๊อปอัปตรวจสอบความละเอียด 1600x1200)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* ROI Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowRoiOverlay((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-sans font-semibold text-xs border transition-all cursor-pointer ${
              showRoiOverlay
                ? 'bg-[#EAF6E8] border-[#C7E0B8] text-[#4F6B4A]'
                : 'bg-[#FFFFFF] border-[#CFCFC4] text-[#85847E] hover:text-[#30312F]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>กรอบพิกัด ROI: {showRoiOverlay ? 'เปิดอยู่' : 'ปิด'}</span>
          </button>

          {/* View Tab Switcher (All 3 Cameras vs Solo Focus) */}
          <div className="flex items-center p-1 bg-[#FAF8EF] border border-[#CFCFC4] rounded-full text-xs font-sans">
            <button
              type="button"
              onClick={() => setActiveCamTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeCamTab === 'all'
                  ? 'bg-white font-bold text-[#30312F] shadow-2xs'
                  : 'text-[#85847E] hover:text-[#30312F]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>แสดง 3 กล้อง</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCamTab('cam1')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeCamTab === 'cam1'
                  ? 'bg-white font-bold text-[#30312F] shadow-2xs'
                  : 'text-[#85847E] hover:text-[#30312F]'
              }`}
            >
              CAM-01
            </button>
            <button
              type="button"
              onClick={() => setActiveCamTab('cam2')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeCamTab === 'cam2'
                  ? 'bg-white font-bold text-[#30312F] shadow-2xs'
                  : 'text-[#85847E] hover:text-[#30312F]'
              }`}
            >
              CAM-02
            </button>
            <button
              type="button"
              onClick={() => setActiveCamTab('cam3')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeCamTab === 'cam3'
                  ? 'bg-white font-bold text-[#30312F] shadow-2xs'
                  : 'text-[#85847E] hover:text-[#30312F]'
              }`}
            >
              CAM-03
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs text-[#30312F] hover:bg-[#FAF8EF] hover:border-[#85847E] transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#4F6B4A]' : 'text-[#30312F]'}`} />
            <span>รีเฟรช {countdown !== undefined ? `(${countdown}s)` : ''}</span>
          </button>
        </div>
      </div>

      {/* 3. Big Camera Feeds Display */}
      <div
        className={`w-full ${
          activeCamTab === 'all'
            ? 'grid grid-cols-1 lg:grid-cols-3 gap-6'
            : 'flex flex-col gap-6 max-w-5xl mx-auto'
        }`}
      >
        {cameras
          .filter((cam) => activeCamTab === 'all' || cam.camId === activeCamTab)
          .map((cam) => {
            const isOnline = Boolean(cam.isOnline)
            const carTotal = cam.car?.total || 0
            const carFree = cam.car?.free || 0
            const carOccupied = Math.max(0, carTotal - carFree)
            const bikeTotal = cam.bike?.total || 0
            const bikeFree = cam.bike?.free || 0
            const bikeOccupied = Math.max(0, bikeTotal - bikeFree)
            const telemetry = cam.realTelemetry || {}

            return (
              <div
                key={cam.camId}
                className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[24px] p-6 flex flex-col justify-between gap-5 shadow-2xs hover:border-[#85847E] transition-all"
              >
                {/* Top Info Bar */}
                <div className="flex items-center justify-between gap-3 border-b border-[#F4F1E8] pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-base px-2.5 py-0.5 rounded-[8px] bg-[#FAF8EF] border border-[#CFCFC4] text-[#30312F]">
                      {cam.slotCode}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-sans font-bold text-base text-[#30312F] truncate">
                        {cam.name}
                      </h2>
                      <p className="font-sans text-xs text-[#85847E] truncate">
                        {cam.subtitle || cam.device} · IP {cam.ip}
                      </p>
                    </div>
                  </div>

                  {/* Status Tag: ONLY ONLINE / OFFLINE */}
                  <span
                    className={`px-3 py-1 rounded-full font-sans font-semibold text-xs uppercase tracking-wider shrink-0 ${
                      isOnline
                        ? 'bg-[#EAF6E8] text-[#4F6B4A]'
                        : 'bg-[#FDECEC] text-[#A33A3A]'
                    }`}
                  >
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                {/* Big 16:9 Viewport (Click to open Pop-up inspection) */}
                <div
                  className="relative w-full aspect-video rounded-[16px] overflow-hidden border border-[#CFCFC4] bg-[#F4F1E8] flex items-center justify-center cursor-pointer group/stream"
                  onClick={() => onOpenModal && onOpenModal(cam)}
                  title="คลิกเพื่อเปิดป๊อปอัปตรวจสอบความละเอียด 1600x1200"
                >
                  <img
                    src={cam.imageUrl}
                    alt={cam.name}
                    className="w-full h-full object-cover group-hover/stream:scale-[1.015] transition-transform duration-200"
                    onError={(e) => {
                      e.currentTarget.src = '/dump_data/images/2026-09-22_18-02-28_966.jpg'
                    }}
                  />

                  {/* Offline Warning Banner */}
                  {!isOnline && (
                    <div className="absolute top-3 left-3 right-3 p-2 rounded-[12px] bg-[#FDECEC]/95 border border-[#E8C7C7] text-[#A33A3A] text-xs font-medium flex items-center gap-2 z-20 shadow-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>ขาดการส่งสัญญาณภาพ (ตรวจสอบเครือข่าย WiFi)</span>
                    </div>
                  )}

                  {/* Corner Resolution Badge */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-white flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-[#83F04C] animate-pulse" />
                    <span>1600x1200 LIVE</span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#30312F]/45 opacity-0 group-hover/stream:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white font-sans backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-bold">คลิกเปิดป๊อปอัปดูภาพแบบละเอียด</span>
                    <span className="text-xs text-white/80">ตรวจสอบ Polygon ROI & ESP32 Telemetry</span>
                  </div>
                </div>

                {/* Slot Breakdown Strip */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Car count */}
                  <div className="p-3 bg-[#FAF8EF] border border-[#CFCFC4] rounded-[14px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[8px] bg-white border border-[#CFCFC4] flex items-center justify-center text-[#30312F]">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-sans text-xs font-semibold text-[#30312F]">รถยนต์ (Car)</span>
                        <span className="block font-sans text-[11px] text-[#85847E]">จอดแล้ว {carOccupied} คัน</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-[#284E1A]">{carFree}</span>
                      <span className="font-mono text-xs text-[#85847E]">/{carTotal} ว่าง</span>
                    </div>
                  </div>

                  {/* Bike count */}
                  <div className="p-3 bg-[#FAF8EF] border border-[#CFCFC4] rounded-[14px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[8px] bg-white border border-[#CFCFC4] flex items-center justify-center text-[#30312F]">
                        <Bike className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-sans text-xs font-semibold text-[#30312F]">มอเตอร์ไซค์</span>
                        <span className="block font-sans text-[11px] text-[#85847E]">จอดแล้ว {bikeOccupied} คัน</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-[#284E1A]">{bikeFree}</span>
                      <span className="font-mono text-xs text-[#85847E]">/{bikeTotal} ว่าง</span>
                    </div>
                  </div>
                </div>

                {/* Edge Hardware Telemetry */}
                <div className="p-3 bg-[#F4F1E8]/70 border border-[#CFCFC4] rounded-[14px] grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="block text-[10px] text-[#85847E] uppercase font-sans">Chip Temp</span>
                    <span className="font-mono font-bold text-[#30312F] text-[13px]">
                      {telemetry.chip_temp_c ? `${telemetry.chip_temp_c}°C` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#85847E] uppercase font-sans">WiFi Signal</span>
                    <span className="font-mono font-bold text-[#30312F] text-[13px]">
                      {telemetry.wifi_rssi_dbm ? `${telemetry.wifi_rssi_dbm}dBm` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#85847E] uppercase font-sans">Free Heap</span>
                    <span className="font-mono font-bold text-[#30312F] text-[13px]">
                      {telemetry.free_heap ? `${Math.round(telemetry.free_heap / 1024)}KB` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#85847E] uppercase font-sans">Latency</span>
                    <span className="font-mono font-bold text-[#4F6B4A] text-[13px]">
                      {cam.latency || '28ms'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#F4F1E8]">
                  <button
                    type="button"
                    onClick={() => onOpenModal && onOpenModal(cam)}
                    className="flex-1 py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#FAF8EF] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs text-[#30312F] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#30312F]" />
                    <span>เปิดป๊อปอัปตรวจสอบ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('setup', cam.camId)}
                    className="py-2.5 px-4 bg-[#FAF8EF] hover:bg-[#EAF6E8] text-[#30312F] hover:text-[#4F6B4A] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>ตั้งค่า ROI</span>
                  </button>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
