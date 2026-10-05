import React from 'react'
import {
  Cpu,
  Thermometer,
  Wifi,
  HardDrive,
  Clock
} from 'lucide-react'
import { formatUptime } from '../../../utils/dumpData'
import { PillTag } from '../../../components/ui/FigmaCards'

export default function EdgeTelemetry({ currentRecord }) {
  // Threshold calculations:
  // - Chip Temp: < 75°C is normal ("ปกติ"), >= 75°C is high ("สูง")
  // - WiFi RSSI: >= -70 dBm is good ("สัญญาณดี"), < -70 dBm is weak ("สัญญาณอ่อน")
  const hasTemp = currentRecord?.chip_temp_c !== undefined && currentRecord?.chip_temp_c !== null
  const tempStatus = hasTemp
    ? (currentRecord.chip_temp_c < 75 ? 'ปกติ' : 'สูง')
    : '—'

  const hasRssi = currentRecord?.wifi_rssi_dbm !== undefined && currentRecord?.wifi_rssi_dbm !== null
  const rssiStatus = hasRssi
    ? (currentRecord.wifi_rssi_dbm >= -70 ? 'สัญญาณดี' : 'สัญญาณอ่อน')
    : '—'

  const tempVal = hasTemp ? `${currentRecord.chip_temp_c}°C` : '—'
  const rssiVal = hasRssi ? `${currentRecord.wifi_rssi_dbm} dBm` : '—'

  const hasHeap = currentRecord?.free_heap !== undefined && currentRecord?.free_heap !== null
  const heapVal = hasHeap
    ? `${Math.round(currentRecord.free_heap / 1024)} KB`
    : '—'

  const hasPsram = currentRecord?.free_psram !== undefined && currentRecord?.free_psram !== null
  const psramVal = hasPsram
    ? `PSRAM: ${(currentRecord.free_psram / (1024 * 1024)).toFixed(1)}MB`
    : 'PSRAM: —'

  const hasUptime = currentRecord?.uptime_sec !== undefined && currentRecord?.uptime_sec !== null
  const uptimeVal = hasUptime
    ? formatUptime(currentRecord.uptime_sec)
    : '—'

  const hasAec = currentRecord?.light_aec_value !== undefined && currentRecord?.light_aec_value !== null
  const aecVal = hasAec
    ? `AEC: ${currentRecord.light_aec_value}`
    : 'AEC: —'

  const ipVal = currentRecord?.client_ip || '—'

  return (
    <div className="p-6 lg:p-7 rounded-[24px] bg-[#FFFDF7] border border-[#DEDED2] shadow-xs flex flex-col justify-between gap-5 min-w-0 box-sizing-border">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#E7F4D8] text-[#284E1A] flex items-center justify-center">
            <Cpu className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#30312F]">ESP32 Edge Telemetry</h3>
            <p className="text-[11px] text-[#85847E]">เซนเซอร์ฮาร์ดแวร์ประจำกล้องหลัก</p>
          </div>
        </div>
        <PillTag variant={currentRecord ? 'active' : 'neutral'}>
          {currentRecord ? 'Live Node' : 'No Data'}
        </PillTag>
      </div>

      {/* 2x2 Telemetry Tiles */}
      <div className="grid grid-cols-2 gap-3">
        {/* Chip Temp */}
        <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#85847E] uppercase tracking-wider">
            <span>Chip Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-[#85847E]" strokeWidth={1.7} />
          </div>
          <div className="font-mono text-xl font-bold text-[#30312F] tabular-nums">
            {tempVal}
          </div>
          <span className="text-[11px] text-[#85847E] font-medium">
            {tempStatus}
          </span>
        </div>

        {/* WiFi RSSI */}
        <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#85847E] uppercase tracking-wider">
            <span>WiFi Signal</span>
            <Wifi className="w-3.5 h-3.5 text-[#85847E]" strokeWidth={1.7} />
          </div>
          <div className="font-mono text-xl font-bold text-[#30312F] tabular-nums">
            {rssiVal}
          </div>
          <span className="text-[11px] text-[#85847E] font-medium">
            {rssiStatus}
          </span>
        </div>

        {/* Free Heap */}
        <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#85847E] uppercase tracking-wider">
            <span>Free Heap</span>
            <HardDrive className="w-3.5 h-3.5 text-[#85847E]" strokeWidth={1.7} />
          </div>
          <div className="font-mono text-xl font-bold text-[#30312F] tabular-nums">
            {heapVal}
          </div>
          <span className="text-[11px] text-[#85847E] font-mono tabular-nums">
            {psramVal}
          </span>
        </div>

        {/* Uptime */}
        <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#85847E] uppercase tracking-wider">
            <span>Uptime</span>
            <Clock className="w-3.5 h-3.5 text-[#85847E]" strokeWidth={1.7} />
          </div>
          <div className="font-mono text-sm font-bold text-[#30312F] tabular-nums truncate">
            {uptimeVal}
          </div>
          <span className="text-[11px] text-[#85847E] font-mono tabular-nums">
            {aecVal}
          </span>
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="pt-3 border-t border-[#DEDED2] flex items-center justify-between text-xs text-[#85847E]">
        <span>ESP32 IP: <strong className="font-mono text-[#30312F]">{ipVal}</strong></span>
        <span className="text-[11px] text-[#85847E]">Auto sync ทุก snapshot</span>
      </div>
    </div>
  )
}
