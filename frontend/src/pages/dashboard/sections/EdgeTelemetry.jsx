import React from 'react'
import {
  Cpu,
  Thermometer,
  Wifi,
  HardDrive,
  Clock
} from 'lucide-react'
import { formatUptime } from '../../../utils/dumpData'

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
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between gap-4 min-w-0 box-sizing-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--color-green-text)]" strokeWidth={1.7} />
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">ESP32 Edge Telemetry</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-semibold bg-[var(--color-green-tint)] text-[var(--color-green-text)] border border-[var(--color-green-border)]">
          {currentRecord ? 'Live Node' : 'No Data'}
        </span>
      </div>

      {/* 2x2 Telemetry Tiles */}
      <div className="grid grid-cols-2 gap-3">
        {/* Chip Temp */}
        <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-ink-secondary)] uppercase tracking-wider">
            <span>Chip Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-[var(--color-ink-secondary)]" strokeWidth={1.7} />
          </div>
          <div className="font-sans text-xl font-semibold text-[var(--color-ink)] tabular-nums">
            {tempVal}
          </div>
          <span className="text-[10px] text-[var(--color-ink-secondary)] font-medium">
            {tempStatus}
          </span>
        </div>

        {/* WiFi RSSI */}
        <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-ink-secondary)] uppercase tracking-wider">
            <span>WiFi Signal</span>
            <Wifi className="w-3.5 h-3.5 text-[var(--color-ink-secondary)]" strokeWidth={1.7} />
          </div>
          <div className="font-sans text-xl font-semibold text-[var(--color-ink)] tabular-nums">
            {rssiVal}
          </div>
          <span className="text-[10px] text-[var(--color-ink-secondary)] font-medium">
            {rssiStatus}
          </span>
        </div>

        {/* Free Heap */}
        <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-ink-secondary)] uppercase tracking-wider">
            <span>Free Heap</span>
            <HardDrive className="w-3.5 h-3.5 text-[var(--color-ink-secondary)]" strokeWidth={1.7} />
          </div>
          <div className="font-sans text-xl font-semibold text-[var(--color-ink)] tabular-nums">
            {heapVal}
          </div>
          <span className="text-[10px] text-[var(--color-ink-secondary)] font-sans tabular-nums">
            {psramVal}
          </span>
        </div>

        {/* Uptime */}
        <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-ink-secondary)] uppercase tracking-wider">
            <span>Uptime</span>
            <Clock className="w-3.5 h-3.5 text-[var(--color-ink-secondary)]" strokeWidth={1.7} />
          </div>
          <div className="font-sans text-sm font-semibold text-[var(--color-ink)] tabular-nums truncate">
            {uptimeVal}
          </div>
          <span className="text-[10px] text-[var(--color-ink-secondary)] font-sans tabular-nums">
            {aecVal}
          </span>
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-ink-secondary)]">
        <span>IP: <strong className="font-mono text-[var(--color-ink)]">{ipVal}</strong></span>
      </div>
    </div>
  )
}
